"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// Penalty Kick: A canvas-based penalty shootout mini game
// Pick a zone, beat the keeper, build a streak
// ============================================================

// --- Colors ---
const FIELD_GREEN = "#1B5E20";
const FIELD_GREEN_ALT = "#1a6b1f";
const NET_BG = "rgba(0,0,0,0.45)";
const POST_COLOR = "#ccc";
const CROSSBAR_HIGHLIGHT = "#fff";
const KEEPER_JERSEY = "#FF8F00";
const KEEPER_SHORTS = "#1a1a2e";
const KEEPER_SKIN = "#E8B87A";
const KEEPER_GLOVES = "#4CAF50";
const BALL_COLOR = "#fff";
const BALL_PANEL = "#222";
const GOAL_GREEN = "#00E676";
const SAVE_RED = "#EF4444";
const GOLD = "#FFD700";

// --- Canvas dimensions ---
const CANVAS_W = 500;
const CANVAS_H = 340;

// --- Game constants ---
const ALL_ZONES = [0, 1, 2, 3, 4, 5] as const;
type Zone = 0 | 1 | 2 | 3 | 4 | 5;
const ZONE_NAMES = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"];

type GamePhase = "menu" | "ready" | "kicking" | "result" | "gameover";

// --- Goal geometry (relative to canvas) ---
const GOAL_LEFT = 0.15;
const GOAL_RIGHT = 0.85;
const GOAL_TOP = 0.08;
const GOAL_BOTTOM = 0.53;

function goalRect() {
  return {
    x: CANVAS_W * GOAL_LEFT,
    y: CANVAS_H * GOAL_TOP,
    w: CANVAS_W * (GOAL_RIGHT - GOAL_LEFT),
    h: CANVAS_H * (GOAL_BOTTOM - GOAL_TOP),
  };
}

function zoneCenter(zone: Zone): { x: number; y: number } {
  const g = goalRect();
  const col = zone % 3;
  const row = Math.floor(zone / 3);
  const cellW = g.w / 3;
  const cellH = g.h / 2;
  return {
    x: g.x + cellW * col + cellW / 2,
    y: g.y + cellH * row + cellH / 2,
  };
}

// --- Particle system (fixed pool) ---
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

const MAX_PARTICLES = 120;
const CONFETTI_COLORS = ["#00E676", "#FFD700", "#fff", "#4CAF50", "#FF5722", "#2196F3"];

function createParticlePool(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: "#fff", size: 2, active: false });
  }
  return pool;
}

function emitParticles(
  pool: Particle[], count: number,
  x: number, y: number,
  opts: { speedMin: number; speedMax: number; lifeFrames: number; colors: string[]; sizeMin: number; sizeMax: number; gravity?: boolean },
) {
  let emitted = 0;
  for (let i = 0; i < pool.length && emitted < count; i++) {
    if (!pool[i].active) {
      const angle = Math.random() * Math.PI * 2;
      const speed = opts.speedMin + Math.random() * (opts.speedMax - opts.speedMin);
      pool[i].x = x;
      pool[i].y = y;
      pool[i].vx = Math.cos(angle) * speed;
      pool[i].vy = Math.sin(angle) * speed - (opts.gravity ? 2 : 0);
      pool[i].life = opts.lifeFrames;
      pool[i].maxLife = opts.lifeFrames;
      pool[i].color = opts.colors[Math.floor(Math.random() * opts.colors.length)];
      pool[i].size = opts.sizeMin + Math.random() * (opts.sizeMax - opts.sizeMin);
      pool[i].active = true;
      emitted++;
    }
  }
}

function updateParticles(pool: Particle[]) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.98;
    p.life--;
    if (p.life <= 0) p.active = false;
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, pool: Particle[]) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// --- Streak & scoring ---
function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 7) return 2;
  if (streak >= 5) return 1.5;
  if (streak >= 3) return 1.25;
  return 1;
}

function getMultiplierColor(mult: number): string {
  if (mult >= 2) return "#ff4444";
  if (mult >= 1.5) return "#FF8F00";
  if (mult >= 1.25) return GOLD;
  return "white";
}

function getBasePoints(streak: number): number {
  if (streak >= 8) return 5;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

// --- Difficulty: keeper zone selection biased toward player's shot ---
function pickKeeperZone(shotZone: Zone, streak: number): Zone {
  if (streak < 3) {
    const pool = ALL_ZONES.filter(z => z !== shotZone);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let saveChance: number;
  if (streak < 5) saveChance = 0.22;
  else if (streak < 7) saveChance = 0.30;
  else if (streak < 10) saveChance = 0.38;
  else saveChance = 0.45;

  if (Math.random() < saveChance) {
    return shotZone;
  }
  const pool = ALL_ZONES.filter(z => z !== shotZone);
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- Leaderboard ---
const LS_KEY = "portal-penalty-scores";

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e: unknown): e is LeaderboardEntry =>
          typeof e === "object" && e !== null &&
          typeof (e as LeaderboardEntry).name === "string" &&
          typeof (e as LeaderboardEntry).score === "number" &&
          isFinite((e as LeaderboardEntry).score),
      )
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score)
      .slice(0, 10);
  } catch { return []; }
}

function saveToLeaderboard(name: string, score: number) {
  const entries = loadLeaderboard();
  entries.push({ name, score, date: new Date().toISOString() });
  entries.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, 10)));
  } catch { /* storage full */ }
}

// --- Easing ---
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// --- Component ---

export default function PenaltyKick() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs
  const phaseRef = useRef<GamePhase>("menu");
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestScoreRef = useRef(0);
  const totalKicksRef = useRef(0);

  // Shot state
  const shotZoneRef = useRef<Zone | null>(null);
  const keeperZoneRef = useRef<Zone | null>(null);
  const isGoalRef = useRef(false);

  // Animation timers
  const kickTimerRef = useRef(0);
  const resultTimerRef = useRef(0);
  const resultFrameRef = useRef(0);

  // Ball animation
  const ballAnimRef = useRef(0);

  // Keeper animation
  const keeperAnimRef = useRef(0);

  // Particles
  const particlesRef = useRef<Particle[]>(createParticlePool());

  // Screen effects
  const shakeIntensityRef = useRef(0);
  const shakeTimerRef = useRef(0);
  const shakeMaxTimerRef = useRef(0);
  const flashColorRef = useRef("");
  const flashTimerRef = useRef(0);
  const flashMaxTimerRef = useRef(0);

  // Streak display
  const streakBrokenRef = useRef(false);

  // Score animation
  const animatedScoreRef = useRef(0);
  const prevScoreRef = useRef(0);
  const scoreAnimTimerRef = useRef(0);
  const scoreAnimMaxRef = useRef(36);
  const scoreBounceRef = useRef(0);

  // Hovered zone
  const hoveredZoneRef = useRef<Zone | null>(null);

  // Frame counter & scale
  const frameCountRef = useRef(0);
  const animFrameRef = useRef(0);
  const scaleRef = useRef(1);

  // React state for UI
  const [_phase, setPhase] = useState<GamePhase>("menu");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pk_best_score");
      if (saved) bestScoreRef.current = parseInt(saved, 10) || 0;
    } catch { /* noop */ }
  }, []);

  // --- Game logic ---
  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    streakRef.current = 0;
    totalKicksRef.current = 0;
    shotZoneRef.current = null;
    keeperZoneRef.current = null;
    isGoalRef.current = false;
    kickTimerRef.current = 0;
    resultTimerRef.current = 0;
    resultFrameRef.current = 0;
    ballAnimRef.current = 0;
    keeperAnimRef.current = 0;
    shakeIntensityRef.current = 0;
    shakeTimerRef.current = 0;
    shakeMaxTimerRef.current = 0;
    flashColorRef.current = "";
    flashTimerRef.current = 0;
    flashMaxTimerRef.current = 0;
    streakBrokenRef.current = false;
    animatedScoreRef.current = 0;
    prevScoreRef.current = 0;
    scoreAnimTimerRef.current = 0;
    scoreBounceRef.current = 0;
    hoveredZoneRef.current = null;
    for (let i = 0; i < particlesRef.current.length; i++) {
      particlesRef.current[i].active = false;
    }
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    phaseRef.current = "ready";
    setPhase("ready");
  }, [resetGame]);

  const endGame = useCallback(() => {
    phaseRef.current = "gameover";
    setPhase("gameover");

    const finalScore = scoreRef.current;

    if (finalScore > bestScoreRef.current) {
      bestScoreRef.current = finalScore;
      try { localStorage.setItem("pk_best_score", String(finalScore)); } catch { /* noop */ }
    }

    if (finalScore > 0) {
      const name = window.prompt(`You scored ${finalScore} pts! Enter your name for the leaderboard:`);
      if (name && name.trim()) {
        saveToLeaderboard(name.trim(), finalScore);
        setLeaderboard(loadLeaderboard());
      }
    }
  }, []);

  const shoot = useCallback((zone: Zone) => {
    if (phaseRef.current !== "ready") return;

    const keeper = pickKeeperZone(zone, streakRef.current);
    const goal = zone !== keeper;

    shotZoneRef.current = zone;
    keeperZoneRef.current = keeper;
    isGoalRef.current = goal;
    totalKicksRef.current++;
    kickTimerRef.current = 40;
    ballAnimRef.current = 0;
    keeperAnimRef.current = 0;

    phaseRef.current = "kicking";
    setPhase("kicking");
  }, []);

  // --- Input handlers ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getZoneFromClick(clientX: number, clientY: number): Zone | null {
      const rect = canvas!.getBoundingClientRect();
      const mx = (clientX - rect.left) / scaleRef.current;
      const my = (clientY - rect.top) / scaleRef.current;

      const g = goalRect();
      if (mx < g.x || mx > g.x + g.w || my < g.y || my > g.y + g.h) return null;

      const col = Math.floor(((mx - g.x) / g.w) * 3);
      const row = Math.floor(((my - g.y) / g.h) * 2);
      return (row * 3 + col) as Zone;
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      const phase = phaseRef.current;
      if (phase === "menu" || phase === "gameover") {
        startGame();
        return;
      }
      if (phase === "ready") {
        const zone = getZoneFromClick(e.clientX, e.clientY);
        if (zone !== null) shoot(zone);
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (phaseRef.current !== "ready") {
        hoveredZoneRef.current = null;
        return;
      }
      const zone = getZoneFromClick(e.clientX, e.clientY);
      hoveredZoneRef.current = zone;
    }

    function onMouseLeave() {
      hoveredZoneRef.current = null;
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const phase = phaseRef.current;
      if (phase === "menu" || phase === "gameover") {
        startGame();
        return;
      }
      if (phase === "ready") {
        const t = e.touches[0];
        const zone = getZoneFromClick(t.clientX, t.clientY);
        if (zone !== null) shoot(zone);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const phase = phaseRef.current;
        if (phase === "menu" || phase === "gameover") startGame();
      }
    }

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("keydown", onKey);
    };
  }, [shoot, startGame]);

  // --- Resize ---
  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const maxW = container.clientWidth;
      const maxH = Math.min(400, window.innerHeight * 0.6);
      const scaleW = maxW / CANVAS_W;
      const scaleH = maxH / CANVAS_H;
      const scale = Math.min(scaleW, scaleH, 1);
      scaleRef.current = scale;

      canvas.style.width = `${CANVAS_W * scale}px`;
      canvas.style.height = `${CANVAS_H * scale}px`;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // --- Main game loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function gameLoop() {
      if (!ctx) return;
      const phase = phaseRef.current;
      frameCountRef.current++;

      // --- Update ---

      // Kicking animation
      if (phase === "kicking") {
        kickTimerRef.current--;
        ballAnimRef.current = Math.min(ballAnimRef.current + 0.04, 1);
        keeperAnimRef.current = Math.min(keeperAnimRef.current + 0.035, 1);

        if (kickTimerRef.current <= 0) {
          const goal = isGoalRef.current;
          const shotCenter = zoneCenter(shotZoneRef.current!);

          resultFrameRef.current = 0;
          resultTimerRef.current = goal ? 70 : 80;

          if (goal) {
            streakRef.current++;
            const mult = getStreakMultiplier(streakRef.current);
            const basePts = getBasePoints(streakRef.current);
            const pts = Math.round(basePts * mult);
            prevScoreRef.current = scoreRef.current;
            scoreRef.current += pts;
            scoreAnimTimerRef.current = scoreAnimMaxRef.current;
            streakBrokenRef.current = false;

            emitParticles(particlesRef.current, 80, shotCenter.x, shotCenter.y, {
              speedMin: 1, speedMax: 5, lifeFrames: 50,
              colors: CONFETTI_COLORS, sizeMin: 2, sizeMax: 5, gravity: true,
            });

            shakeIntensityRef.current = 6;
            shakeTimerRef.current = 12;
            shakeMaxTimerRef.current = 12;
            flashColorRef.current = "rgba(0,230,118,0.15)";
            flashTimerRef.current = 15;
            flashMaxTimerRef.current = 15;
          } else {
            if (streakRef.current >= 3) streakBrokenRef.current = true;
            streakRef.current = 0;

            shakeIntensityRef.current = 8;
            shakeTimerRef.current = 10;
            shakeMaxTimerRef.current = 10;
            flashColorRef.current = "rgba(239,68,68,0.18)";
            flashTimerRef.current = 15;
            flashMaxTimerRef.current = 15;

            emitParticles(particlesRef.current, 20, shotCenter.x, shotCenter.y, {
              speedMin: 2, speedMax: 4, lifeFrames: 20,
              colors: ["#fff", "#aaa"], sizeMin: 1, sizeMax: 3,
            });
          }

          phaseRef.current = "result";
          setPhase("result");
        }
      }

      // Result phase
      if (phase === "result") {
        resultTimerRef.current--;
        resultFrameRef.current++;
        if (resultTimerRef.current <= 0) {
          if (!isGoalRef.current) {
            endGame();
          } else {
            shotZoneRef.current = null;
            keeperZoneRef.current = null;
            ballAnimRef.current = 0;
            keeperAnimRef.current = 0;
            streakBrokenRef.current = false;
            hoveredZoneRef.current = null;
            phaseRef.current = "ready";
            setPhase("ready");
          }
        }
      }

      // Particles
      updateParticles(particlesRef.current);

      // Shake
      if (shakeTimerRef.current > 0) shakeTimerRef.current--;

      // Flash
      if (flashTimerRef.current > 0) flashTimerRef.current--;

      // Score animation
      if (scoreAnimTimerRef.current > 0) {
        scoreAnimTimerRef.current--;
        const t = 1 - scoreAnimTimerRef.current / scoreAnimMaxRef.current;
        const eased = easeOutExpo(t);
        animatedScoreRef.current = prevScoreRef.current + (scoreRef.current - prevScoreRef.current) * eased;
        if (scoreAnimTimerRef.current === 0) {
          animatedScoreRef.current = scoreRef.current;
          scoreBounceRef.current = 8;
        }
      }
      if (scoreBounceRef.current > 0) scoreBounceRef.current--;

      // --- Draw ---
      ctx.save();

      // Screen shake
      if (shakeTimerRef.current > 0) {
        const ratio = shakeTimerRef.current / shakeMaxTimerRef.current;
        const sx = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        const sy = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        ctx.translate(sx, sy);
      }

      // --- Background: pitch ---
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, "#0e2b0e");
      grad.addColorStop(0.35, FIELD_GREEN_ALT);
      grad.addColorStop(1, FIELD_GREEN);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grass stripes
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fillRect(0, (i / 8) * CANVAS_H, CANVAS_W, CANVAS_H / 16);
        }
      }

      // --- Goal ---
      const g = goalRect();
      const postW = 5;

      // Net background
      ctx.fillStyle = NET_BG;
      ctx.fillRect(g.x, g.y, g.w, g.h);

      // Net mesh
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let nx = g.x; nx < g.x + g.w; nx += 14) {
        ctx.beginPath();
        ctx.moveTo(nx, g.y);
        ctx.lineTo(nx, g.y + g.h);
        ctx.stroke();
      }
      for (let ny = g.y; ny < g.y + g.h; ny += 14) {
        ctx.beginPath();
        ctx.moveTo(g.x, ny);
        ctx.lineTo(g.x + g.w, ny);
        ctx.stroke();
      }

      // Zone hover highlight
      if (phase === "ready" && hoveredZoneRef.current !== null) {
        const hz = hoveredZoneRef.current;
        const col = hz % 3;
        const row = Math.floor(hz / 3);
        const cellW = g.w / 3;
        const cellH = g.h / 2;
        ctx.fillStyle = "rgba(0, 230, 118, 0.12)";
        ctx.fillRect(g.x + col * cellW, g.y + row * cellH, cellW, cellH);

        // Crosshair
        const ctr = zoneCenter(hz);
        ctx.strokeStyle = "rgba(0, 230, 118, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(0, 230, 118, 0.3)";
        ctx.beginPath();
        ctx.arc(ctr.x, ctr.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Zone divider lines (subtle)
      if (phase === "ready") {
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for (let c = 1; c < 3; c++) {
          const lx = g.x + (g.w / 3) * c;
          ctx.beginPath();
          ctx.moveTo(lx, g.y);
          ctx.lineTo(lx, g.y + g.h);
          ctx.stroke();
        }
        const midY = g.y + g.h / 2;
        ctx.beginPath();
        ctx.moveTo(g.x, midY);
        ctx.lineTo(g.x + g.w, midY);
        ctx.stroke();
      }

      // Posts
      ctx.fillStyle = POST_COLOR;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 6;
      ctx.fillRect(g.x - postW / 2, g.y, postW, g.h);
      ctx.fillRect(g.x + g.w - postW / 2, g.y, postW, g.h);
      // Crossbar
      ctx.fillRect(g.x, g.y - postW / 2, g.w, postW);
      ctx.shadowBlur = 0;

      // Post highlight
      ctx.fillStyle = CROSSBAR_HIGHLIGHT;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(g.x - postW / 2 + 1, g.y, 2, g.h);
      ctx.fillRect(g.x + g.w - postW / 2 + 2, g.y, 2, g.h);
      ctx.fillRect(g.x, g.y - postW / 2, g.w, 2);
      ctx.globalAlpha = 1;

      // --- Penalty area lines ---
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      const boxL = CANVAS_W * 0.22;
      const boxR = CANVAS_W * 0.78;
      const boxT = CANVAS_H * 0.53;
      const boxB = CANVAS_H * 0.85;
      ctx.strokeRect(boxL, boxT, boxR - boxL, boxB - boxT);

      // Penalty spot
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(CANVAS_W / 2, CANVAS_H * 0.78, 3, 0, Math.PI * 2);
      ctx.fill();

      // --- Keeper ---
      const keeperCx = CANVAS_W / 2;
      const keeperCy = g.y + g.h - 30;

      if (keeperZoneRef.current !== null && (phase === "kicking" || phase === "result")) {
        const kz = keeperZoneRef.current;
        const target = zoneCenter(kz);
        const t = easeOutExpo(Math.min(keeperAnimRef.current * 1.8, 1));

        const kx = keeperCx + (target.x - keeperCx) * t;
        const ky = keeperCy + (target.y - keeperCy) * t * 0.5;

        drawKeeper(ctx, kx, ky, kz, t, frameCountRef.current);
      } else {
        drawKeeper(ctx, keeperCx, keeperCy, null, 0, frameCountRef.current);
      }

      // --- Ball ---
      const ballStartX = CANVAS_W / 2;
      const ballStartY = CANVAS_H * 0.76;

      if (shotZoneRef.current !== null && (phase === "kicking" || phase === "result")) {
        const target = zoneCenter(shotZoneRef.current);
        const t = easeOutExpo(Math.min(ballAnimRef.current * 1.5, 1));

        const bx = ballStartX + (target.x - ballStartX) * t;
        const by = ballStartY + (target.y - ballStartY) * t;
        const ballSize = 16 - t * 6;

        const rotation = t * Math.PI * 6;

        drawBall(ctx, bx, by, ballSize, rotation);
      } else if (phase === "ready" || phase === "menu") {
        drawBall(ctx, ballStartX, ballStartY, 16, 0);
      }

      // --- Particles ---
      drawParticles(ctx, particlesRef.current);

      // --- Result text ---
      if (phase === "result" && resultTimerRef.current > 0) {
        const rf = resultFrameRef.current;
        const alpha = Math.min(resultTimerRef.current / 30, 1);
        const bounceT = rf / 80;
        const scale = 1 + Math.sin(bounceT * Math.PI) * 0.15;

        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.scale(scale, scale);

        if (rf >= 0) {
          const fadeIn = Math.min(rf / 6, 1);
          ctx.font = "bold 52px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.globalAlpha = fadeIn * alpha;
          ctx.fillText(isGoalRef.current ? "GOAL!" : "SAVED!", 2, 2);

          ctx.fillStyle = isGoalRef.current ? GOAL_GREEN : SAVE_RED;
          ctx.fillText(isGoalRef.current ? "GOAL!" : "SAVED!", 0, 0);
        }

        // Points
        if (isGoalRef.current && rf >= 10) {
          const fadeIn2 = Math.min((rf - 10) / 8, 1);
          ctx.globalAlpha = fadeIn2 * alpha;
          const mult = getStreakMultiplier(streakRef.current);
          const basePts = getBasePoints(streakRef.current);
          const pts = Math.round(basePts * mult);
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = mult > 1 ? getMultiplierColor(mult) : "white";
          const ptsText = mult > 1 ? `+${pts} pts (${mult}x)` : `+${pts} pts`;
          ctx.fillText(ptsText, 0, 38);
        }

        // Streak
        if (rf >= 16) {
          const fadeIn3 = Math.min((rf - 16) / 8, 1);
          ctx.globalAlpha = fadeIn3 * alpha;
          if (streakBrokenRef.current) {
            ctx.font = "bold 18px sans-serif";
            ctx.fillStyle = SAVE_RED;
            ctx.fillText("STREAK BROKEN!", 0, isGoalRef.current ? 65 : 38);
          } else if (streakRef.current >= 3 && isGoalRef.current) {
            const pulse = 1 + Math.sin(frameCountRef.current * 0.1) * 0.075;
            ctx.save();
            ctx.scale(pulse, pulse);
            ctx.font = "bold 18px sans-serif";
            ctx.fillStyle = getMultiplierColor(getStreakMultiplier(streakRef.current));
            ctx.fillText(`x${streakRef.current} STREAK!`, 0, 65);
            ctx.restore();
          }
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // --- HUD ---
      if (phase !== "menu" && phase !== "gameover") {
        // Score
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        roundRect(ctx, 8, 8, 85, 36, 6);
        ctx.fill();

        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("SCORE", 16, 12);

        const displayed = scoreAnimTimerRef.current > 0
          ? Math.round(animatedScoreRef.current) : scoreRef.current;
        const bs = scoreBounceRef.current > 0 ? 1 + (scoreBounceRef.current / 8) * 0.2 : 1;
        ctx.save();
        ctx.translate(16, 30);
        ctx.scale(bs, bs);
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = GOAL_GREEN;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(String(displayed), 0, 0);
        ctx.restore();

        // Goals count
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        roundRect(ctx, CANVAS_W / 2 - 42, 8, 84, 30, 6);
        ctx.fill();

        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${streakRef.current} Goals`, CANVAS_W / 2, 23);

        // Streak indicator
        if (streakRef.current >= 3 && phase !== "result") {
          const mult = getStreakMultiplier(streakRef.current);
          const pulse = 1 + Math.sin(frameCountRef.current * 0.1) * 0.075;
          ctx.save();
          ctx.translate(CANVAS_W / 2, 48);
          ctx.scale(pulse, pulse);
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`x${streakRef.current} STREAK! ${mult}x`, 0, 0);
          ctx.restore();
        }

        // Best score
        if (bestScoreRef.current > 0) {
          ctx.font = "bold 9px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.textAlign = "right";
          ctx.fillText(`BEST: ${bestScoreRef.current}`, CANVAS_W - 12, CANVAS_H - 8);
        }

        // Prompt
        if (phase === "ready") {
          const blink = Math.sin(frameCountRef.current * 0.08) > 0;
          if (blink) {
            ctx.font = "bold 13px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.textAlign = "center";
            ctx.fillText("Click where you want to shoot", CANVAS_W / 2, CANVAS_H - 12);
          }
        }
      }

      // --- Flash overlay ---
      if (flashTimerRef.current > 0) {
        const flashAlpha = flashTimerRef.current / flashMaxTimerRef.current;
        const base = flashColorRef.current.replace(/[\d.]+\)$/, `${(0.15 * flashAlpha).toFixed(3)})`);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // --- Menu overlay ---
      if (phase === "menu") {
        ctx.fillStyle = "rgba(12, 35, 64, 0.88)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 38px sans-serif";
        ctx.fillStyle = GOAL_GREEN;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PENALTY", CANVAS_W / 2, CANVAS_H / 2 - 70);
        ctx.fillText("KICKS", CANVAS_W / 2, CANVAS_H / 2 - 32);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText("Pick your spot. Beat the keeper.", CANVAS_W / 2, CANVAS_H / 2 + 10);

        // Ball icon
        drawBall(ctx, CANVAS_W / 2, CANVAS_H / 2 + 50, 18, frameCountRef.current * 0.01);

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = GOAL_GREEN;
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 95);
        }

        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Miss and it is game over", CANVAS_W / 2, CANVAS_H / 2 + 120);
      }

      // --- Game Over overlay ---
      if (phase === "gameover") {
        ctx.fillStyle = "rgba(12, 35, 64, 0.88)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = SAVE_RED;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 75);

        ctx.font = "bold 44px sans-serif";
        ctx.fillStyle = GOAL_GREEN;
        ctx.fillText(`${scoreRef.current} PTS`, CANVAS_W / 2, CANVAS_H / 2 - 30);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        const goals = totalKicksRef.current - 1;
        ctx.fillText(
          `${goals} goal${goals === 1 ? "" : "s"} scored`,
          CANVAS_W / 2, CANVAS_H / 2 + 5,
        );

        if (shotZoneRef.current !== null && keeperZoneRef.current !== null) {
          ctx.font = "13px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(
            `Shot ${ZONE_NAMES[shotZoneRef.current]}, keeper dove ${ZONE_NAMES[keeperZoneRef.current]}`,
            CANVAS_W / 2, CANVAS_H / 2 + 28,
          );
        }

        if (bestScoreRef.current > 0) {
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(`Best: ${bestScoreRef.current} pts`, CANVAS_W / 2, CANVAS_H / 2 + 52);
        }

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = GOAL_GREEN;
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 88);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [endGame]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Game canvas */}
      <div ref={containerRef} className="flex-1 flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border-2 border-white/10 shadow-2xl shadow-black/50 cursor-crosshair touch-none"
          style={{ imageRendering: "auto" }}
        />
      </div>

      {/* Leaderboard */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="rounded-xl border border-white/10 bg-[#112d4e] overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-[#DD550C]">
              Leaderboard
            </h3>
          </div>
          {leaderboard.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No scores yet. Be the first!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.map((entry, i) => (
                <div
                  key={`${entry.name}-${entry.score}-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === 0
                        ? "bg-[#DD550C] text-white"
                        : i < 3
                        ? "bg-[#DD550C]/50 text-white"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {entry.name}
                    </p>
                  </div>
                  <span className="font-[family-name:var(--font-heading)] text-sm font-bold text-[#DD550C]">
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Drawing helpers ---

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(2, size * 0.6, size * 0.7, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main ball
  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Pentagon pattern
  ctx.fillStyle = BALL_PANEL;
  const panelSize = size * 0.18;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * size * 0.22;
    const py = Math.sin(a) * size * 0.22;
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const pa = (j / 5) * Math.PI * 2 - Math.PI / 2 + a;
      const ppx = px + Math.cos(pa) * panelSize;
      const ppy = py + Math.sin(pa) * panelSize;
      if (j === 0) ctx.moveTo(ppx, ppy);
      else ctx.lineTo(ppx, ppy);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawKeeper(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  diveZone: Zone | null, diveT: number,
  _frame: number,
) {
  ctx.save();
  ctx.translate(x, y);

  const isDiving = diveZone !== null && diveT > 0.1;
  let rotation = 0;
  if (isDiving) {
    const col = diveZone! % 3;
    if (col === 0) rotation = -diveT * 1.2;
    else if (col === 2) rotation = diveT * 1.2;
  }
  ctx.rotate(rotation);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = KEEPER_SHORTS;
  ctx.fillRect(-8, 14, 7, 12);
  ctx.fillRect(1, 14, 7, 12);

  // Shoes
  ctx.fillStyle = "#222";
  ctx.fillRect(-9, 24, 9, 5);
  ctx.fillRect(0, 24, 9, 5);

  // Body/jersey
  ctx.fillStyle = KEEPER_JERSEY;
  ctx.beginPath();
  ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  const armAngle = isDiving ? diveT * 1.5 : 0;
  ctx.save();
  ctx.rotate(-armAngle);
  ctx.fillStyle = KEEPER_JERSEY;
  ctx.fillRect(-22, -4, 12, 7);
  ctx.fillStyle = KEEPER_GLOVES;
  ctx.fillRect(-25, -3, 6, 9);
  ctx.restore();

  ctx.save();
  ctx.rotate(armAngle);
  ctx.fillStyle = KEEPER_JERSEY;
  ctx.fillRect(10, -4, 12, 7);
  ctx.fillStyle = KEEPER_GLOVES;
  ctx.fillRect(19, -3, 6, 9);
  ctx.restore();

  // Head
  ctx.fillStyle = KEEPER_SKIN;
  ctx.beginPath();
  ctx.arc(0, -12, 9, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = "#4A3520";
  ctx.beginPath();
  ctx.arc(0, -14, 9, Math.PI + 0.4, -0.4);
  ctx.fill();

  // Number
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("1", 0, 6);

  ctx.restore();
}
