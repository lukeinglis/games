"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticlePool, emitParticles, updateParticles, drawParticles, getStreakMultiplier, getMultiplierColor, type Particle } from "@/lib/game-utils";
import { loadLeaderboard, saveToLeaderboard, type LeaderboardEntry } from "@/lib/game-leaderboard";

// ============================================================
// Breakaway: A Subway-Surfer-style football mini game
// Canvas-based, 3-lane top-down runner
// ============================================================

// --- Constants ---

const FIELD_GREEN = "#2d5a27";
const FIELD_GREEN_ALT = "#2a5224";
const YARD_LINE_COLOR = "rgba(255,255,255,0.45)";
const YARD_NUM_COLOR = "rgba(255,255,255,0.22)";
const HASH_COLOR = "rgba(255,255,255,0.2)";
const PLAYER_COLOR = "#DD550C";
const PLAYER_GLOW = "rgba(221,85,12,0.5)";
const TACKLER_COLOR = "#0C2340";
const POWERUP_COLOR = "#FFD700";
const ENDZONE_COLOR = "#DD550C";
const SIDELINE_COLOR = "rgba(255,255,255,0.35)";

const CANVAS_W = 400;
const CANVAS_H = 600;
const LANE_COUNT = 3;
const SIDELINE_W = 30;
const FIELD_W = CANVAS_W - SIDELINE_W * 2;
const LANE_W = FIELD_W / LANE_COUNT;

const PLAYER_W = 28;
const PLAYER_H = 36;
const PLAYER_Y = CANVAS_H - 100;

const TACKLER_W = 30;
const TACKLER_H = 34;
const TACKLER_W_WIDE = LANE_W * 2 - 10;

const POWERUP_SIZE = 22;
const POWERUP_DURATION = 3000;

const INITIAL_SPEED = 3;
const MAX_SPEED = 10;
const SPEED_RAMP = 0.0003;
const TACKLER_SPAWN_INTERVAL_INIT = 60;
const TACKLER_SPAWN_INTERVAL_MIN = 18;

const YARD_LINE_SPACING = 60;

const LOCALSTORAGE_KEY = "portal-breakaway-scores";

const GOAL_COLORS = ["#00cc44", "#FFD700", "#ffffff"];
const TRAIL_COLORS = ["#DD550C", "#FFD700"];

// --- Types ---

interface Tackler {
  lane: number;
  y: number;
  wide: boolean;
  jersey: number;
}

interface Powerup {
  lane: number;
  y: number;
}

interface SpeedLine {
  x: number;
  y: number;
  length: number;
  alpha: number;
}

type GameState = "menu" | "playing" | "gameover";

// --- Helpers ---

function laneX(lane: number): number {
  return SIDELINE_W + lane * LANE_W + LANE_W / 2;
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --- Component ---

export default function BreakawayGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs
  const stateRef = useRef<GameState>("menu");
  const laneRef = useRef(1);
  const yardsRef = useRef(0);
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const fieldOffsetRef = useRef(0);
  const tacklersRef = useRef<Tackler[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const speedLinesRef = useRef<SpeedLine[]>([]);
  const invincibleUntilRef = useRef(0);
  const spawnCounterRef = useRef(0);
  const frameCountRef = useRef(0);
  const animFrameRef = useRef(0);
  const scaleRef = useRef(1);

  // Particle pool
  const poolRef = useRef<Particle[]>(createParticlePool());

  // Screen shake (intensity + timer pattern)
  const shakeIntensityRef = useRef(0);
  const shakeTimerRef = useRef(0);
  const shakeMaxTimerRef = useRef(0);

  // Flash effect
  const flashColorRef = useRef("");
  const flashTimerRef = useRef(0);
  const flashMaxTimerRef = useRef(0);

  // Streak system
  const streakRef = useRef(0);
  const streakBrokenRef = useRef(false);
  const lastFirstDownRef = useRef(0);
  const firstDownFlashRef = useRef(0);

  // Difficulty curve
  const touchdownsRef = useRef(0);

  // React state for UI overlay
  const [gameState, setGameState] = useState<GameState>("menu");
  const [, setYards] = useState(0);
  const [, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard(LOCALSTORAGE_KEY));
  const [scoreSaved, setScoreSaved] = useState(false);
  const [scoreRank, setScoreRank] = useState<number | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const showNameInputRef = useRef(false);

  // --- Game logic ---

  const resetGame = useCallback(() => {
    laneRef.current = 1;
    yardsRef.current = 0;
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    fieldOffsetRef.current = 0;
    tacklersRef.current = [];
    powerupsRef.current = [];
    speedLinesRef.current = [];
    invincibleUntilRef.current = 0;
    spawnCounterRef.current = 0;
    frameCountRef.current = 0;
    shakeIntensityRef.current = 0;
    shakeTimerRef.current = 0;
    shakeMaxTimerRef.current = 0;
    flashColorRef.current = "";
    flashTimerRef.current = 0;
    flashMaxTimerRef.current = 0;
    firstDownFlashRef.current = 0;
    lastFirstDownRef.current = 0;
    streakRef.current = 0;
    streakBrokenRef.current = false;
    touchdownsRef.current = 0;
    for (let i = 0; i < poolRef.current.length; i++) {
      poolRef.current[i].active = false;
    }
    setYards(0);
    setScore(0);
    setScoreSaved(false);
    setScoreRank(null);
    setShowNameInput(false);
    showNameInputRef.current = false;
    setPlayerName("");
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    stateRef.current = "playing";
    setGameState("playing");
  }, [resetGame]);

  const endGame = useCallback(() => {
    stateRef.current = "gameover";
    setGameState("gameover");

    // Big shake on death
    shakeIntensityRef.current = 12;
    shakeTimerRef.current = 18;
    shakeMaxTimerRef.current = 18;

    // Red flash
    flashColorRef.current = "rgba(200,0,0,0.2)";
    flashTimerRef.current = 20;
    flashMaxTimerRef.current = 20;

    const finalYards = Math.floor(yardsRef.current);
    const finalScore = scoreRef.current;
    setYards(finalYards);
    setScore(finalScore);

    if (finalScore > 0) {
      setShowNameInput(true);
      showNameInputRef.current = true;
    }
  }, []);

  const handleSaveScore = useCallback(() => {
    const name = playerName.trim() || "Anonymous";
    const finalScore = scoreRef.current;
    saveToLeaderboard(LOCALSTORAGE_KEY, name, finalScore);
    const updated = loadLeaderboard(LOCALSTORAGE_KEY);
    setLeaderboard(updated);
    setScoreSaved(true);
    const rank = updated.findIndex(
      (e) => e.name === name && e.score === finalScore
    );
    setScoreRank(rank >= 0 ? rank + 1 : null);
    setShowNameInput(false);
    showNameInputRef.current = false;
  }, [playerName]);

  const moveLane = useCallback((dir: -1 | 1) => {
    if (stateRef.current !== "playing") return;
    const next = laneRef.current + dir;
    if (next >= 0 && next < LANE_COUNT) {
      laneRef.current = next;
      // Trail particles on lane change
      emitParticles(poolRef.current, 6, laneX(laneRef.current), PLAYER_Y + 10, {
        speedMin: 0.5, speedMax: 2, lifeFrames: 15,
        colors: TRAIL_COLORS, sizeMin: 2, sizeMax: 4,
      });
    }
  }, []);

  // --- Input handlers ---

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        moveLane(-1);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        moveLane(1);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if ((stateRef.current === "menu" || stateRef.current === "gameover") && !showNameInput) {
          startGame();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveLane, startGame, showNameInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartX = 0;
    let touchStartY = 0;

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;

      if ((stateRef.current === "menu" || stateRef.current === "gameover") && !showNameInputRef.current) {
        startGame();
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;

      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        moveLane(dx > 0 ? 1 : -1);
      } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        const rect = canvas!.getBoundingClientRect();
        const tapX = t.clientX - rect.left;
        if (tapX < rect.width / 2) {
          moveLane(-1);
        } else {
          moveLane(1);
        }
      }
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [moveLane, startGame]);

  // --- Resize handler ---

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const maxW = container.clientWidth;
      const maxH = Math.min(600, window.innerHeight * 0.7);
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

    function spawnTackler() {
      const touchdowns = touchdownsRef.current;

      // Difficulty curve: first 3 touchdowns are easy (onboarding)
      if (touchdowns < 3) {
        // Only spawn in one lane, never wide, never double
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const jersey = 20 + Math.floor(Math.random() * 79);
        tacklersRef.current.push({ lane, y: -TACKLER_H, wide: false, jersey });
        return;
      }

      const lane = Math.floor(Math.random() * LANE_COUNT);
      // Wide tacklers ramp in after onboarding: 0% at td=3, up to 20% at td=10+
      const wideChance = Math.min(0.03 * (touchdowns - 2), 0.2);
      const wide = Math.random() < wideChance && speedRef.current > 4;
      const jersey = 20 + Math.floor(Math.random() * 79);
      tacklersRef.current.push({ lane, y: -TACKLER_H, wide, jersey });
    }

    function spawnPowerup() {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      powerupsRef.current.push({ lane, y: -POWERUP_SIZE });
    }

    function addSpeedLine() {
      speedLinesRef.current.push({
        x: SIDELINE_W + Math.random() * FIELD_W,
        y: -10,
        length: 20 + Math.random() * 40,
        alpha: 0.1 + Math.random() * 0.15,
      });
    }

    function gameLoop() {
      if (!ctx) return;
      const state = stateRef.current;
      const frame = frameCountRef.current++;

      // --- Update ---
      if (state === "playing") {
        const speed = speedRef.current;
        const touchdowns = touchdownsRef.current;

        // Difficulty curve: ramp speed slower during onboarding
        let effectiveRamp = SPEED_RAMP;
        if (touchdowns < 3) {
          effectiveRamp = SPEED_RAMP * 0.4;
        } else {
          // After onboarding, ramp one dimension: speed increases faster with score
          effectiveRamp = SPEED_RAMP * Math.min(1 + touchdowns * 0.05, 2.0);
        }
        speedRef.current = Math.min(speed + effectiveRamp, MAX_SPEED);

        // Field scroll
        fieldOffsetRef.current += speed;

        // Yards
        yardsRef.current += speed * 0.1;
        const currentYards = Math.floor(yardsRef.current);
        if (frame % 5 === 0) setYards(currentYards);

        // First down / touchdown detection (every 100 yards)
        const currentFirstDown = Math.floor(currentYards / 100);
        if (currentFirstDown > lastFirstDownRef.current && currentYards > 0) {
          firstDownFlashRef.current = 60;
          lastFirstDownRef.current = currentFirstDown;
          touchdownsRef.current++;

          // Streak: consecutive first downs count
          streakRef.current++;
          const mult = getStreakMultiplier(streakRef.current);
          const basePts = 100;
          const pts = Math.round(basePts * mult);
          scoreRef.current += pts;
          setScore(scoreRef.current);

          // Goal scored particles (green/gold burst)
          const playerX = laneX(laneRef.current);
          emitParticles(poolRef.current, 60, playerX, PLAYER_Y, {
            speedMin: 1, speedMax: 5, lifeFrames: 50,
            colors: GOAL_COLORS, sizeMin: 2, sizeMax: 5, gravity: true,
          });

          // Screen shake on touchdown
          shakeIntensityRef.current = 8;
          shakeTimerRef.current = 12;
          shakeMaxTimerRef.current = 12;

          // Green flash on touchdown
          flashColorRef.current = "rgba(0,200,0,0.15)";
          flashTimerRef.current = 15;
          flashMaxTimerRef.current = 15;
        }
        if (firstDownFlashRef.current > 0) firstDownFlashRef.current--;

        // Spawn tacklers with difficulty curve
        let spawnInterval: number;
        if (touchdowns < 3) {
          // Onboarding: very generous spacing
          spawnInterval = Math.max(80, TACKLER_SPAWN_INTERVAL_INIT + 20 - frame * 0.005);
        } else {
          // Post-onboarding: ramp spawn rate with touchdowns
          const tighten = Math.min((touchdowns - 2) * 2, 20);
          spawnInterval = Math.max(
            TACKLER_SPAWN_INTERVAL_MIN,
            TACKLER_SPAWN_INTERVAL_INIT - tighten - frame * 0.02
          );
        }
        spawnCounterRef.current++;
        if (spawnCounterRef.current >= spawnInterval) {
          spawnTackler();
          spawnCounterRef.current = 0;
          // Double spawns only after onboarding, rate ramps with touchdowns
          const doubleChance = touchdowns < 3 ? 0 : Math.min(0.1 + touchdowns * 0.02, 0.4);
          if (Math.random() < doubleChance && speed > 5) {
            spawnTackler();
          }
        }

        // Spawn powerups
        if (frame % 400 === 200) {
          spawnPowerup();
        }

        // Move tacklers with difficulty-scaled speed
        let tacklerSpeedMult = 1.1;
        if (touchdowns >= 3) {
          tacklerSpeedMult = 1.1 + Math.min((touchdowns - 2) * 0.05, 0.5);
        }
        tacklersRef.current = tacklersRef.current.filter((t) => {
          t.y += speed * tacklerSpeedMult;
          return t.y < CANVAS_H + 50;
        });

        // Move powerups
        powerupsRef.current = powerupsRef.current.filter((p) => {
          p.y += speed;
          return p.y < CANVAS_H + 50;
        });

        // Player collision rect
        const px = laneX(laneRef.current) - PLAYER_W / 2;
        const py = PLAYER_Y - PLAYER_H / 2;
        const now = Date.now();
        const invincible = now < invincibleUntilRef.current;

        // Check powerup pickup
        powerupsRef.current = powerupsRef.current.filter((p) => {
          const ppx = laneX(p.lane) - POWERUP_SIZE / 2;
          const ppy = p.y - POWERUP_SIZE / 2;
          if (rectsOverlap(px, py, PLAYER_W, PLAYER_H, ppx, ppy, POWERUP_SIZE, POWERUP_SIZE)) {
            invincibleUntilRef.current = now + POWERUP_DURATION;
            // Trail burst on pickup
            emitParticles(poolRef.current, 20, laneX(p.lane), p.y, {
              speedMin: 1, speedMax: 4, lifeFrames: 25,
              colors: TRAIL_COLORS, sizeMin: 2, sizeMax: 4,
            });
            return false;
          }
          return true;
        });

        // Check tackler collision
        if (!invincible) {
          for (const t of tacklersRef.current) {
            const tw = t.wide ? TACKLER_W_WIDE : TACKLER_W;
            const tlane = t.wide
              ? Math.min(t.lane, LANE_COUNT - 2)
              : t.lane;
            const tx = t.wide
              ? SIDELINE_W + tlane * LANE_W + (LANE_W * 2 - tw) / 2
              : laneX(t.lane) - tw / 2;
            const ty = t.y - TACKLER_H / 2;
            if (rectsOverlap(px, py, PLAYER_W, PLAYER_H, tx, ty, tw, TACKLER_H)) {
              // Collision shake
              shakeIntensityRef.current = 12;
              shakeTimerRef.current = 18;
              shakeMaxTimerRef.current = 18;

              // Break streak on death
              if (streakRef.current >= 3) {
                streakBrokenRef.current = true;
              }
              streakRef.current = 0;

              endGame();
              break;
            }
          }
        }

        // Trail particles from runner at high speed
        if (speed > 5 && frame % 3 === 0) {
          emitParticles(poolRef.current, 2, laneX(laneRef.current), PLAYER_Y + PLAYER_H / 2, {
            speedMin: 0.3, speedMax: 1.5, lifeFrames: 12,
            colors: ["#4a8c3e", "#3d7534"], sizeMin: 2, sizeMax: 3,
          });
        }

        // Speed lines at high speed
        if (speed > 5 && frame % 3 === 0) {
          addSpeedLine();
        }

        // Update speed lines
        speedLinesRef.current = speedLinesRef.current.filter((s) => {
          s.y += speed * 2;
          return s.y < CANVAS_H + 50;
        });
      }

      // Update particle pool
      updateParticles(poolRef.current);

      // Shake timer decay
      if (shakeTimerRef.current > 0) {
        shakeTimerRef.current--;
      }

      // Flash timer decay
      if (flashTimerRef.current > 0) {
        flashTimerRef.current--;
      }

      // --- Draw ---
      ctx.save();

      // Screen shake (intensity + timer pattern)
      if (shakeTimerRef.current > 0) {
        const ratio = shakeTimerRef.current / shakeMaxTimerRef.current;
        const sx = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        const sy = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        ctx.translate(sx, sy);
      }

      // Field background
      const offset = fieldOffsetRef.current % (YARD_LINE_SPACING * 2);
      for (let y = -YARD_LINE_SPACING * 2; y < CANVAS_H + YARD_LINE_SPACING; y += YARD_LINE_SPACING) {
        const fy = y + offset;
        const stripIndex = Math.floor((y + YARD_LINE_SPACING * 4) / YARD_LINE_SPACING);
        ctx.fillStyle = stripIndex % 2 === 0 ? FIELD_GREEN : FIELD_GREEN_ALT;
        ctx.fillRect(SIDELINE_W, fy, FIELD_W, YARD_LINE_SPACING);
      }

      // Sidelines
      ctx.fillStyle = "#1a4a15";
      ctx.fillRect(0, 0, SIDELINE_W, CANVAS_H);
      ctx.fillRect(CANVAS_W - SIDELINE_W, 0, SIDELINE_W, CANVAS_H);

      ctx.strokeStyle = SIDELINE_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SIDELINE_W, 0);
      ctx.lineTo(SIDELINE_W, CANVAS_H);
      ctx.moveTo(CANVAS_W - SIDELINE_W, 0);
      ctx.lineTo(CANVAS_W - SIDELINE_W, CANVAS_H);
      ctx.stroke();

      // Yard lines + numbers
      const yardOffset = fieldOffsetRef.current % YARD_LINE_SPACING;
      for (let y = -YARD_LINE_SPACING; y < CANVAS_H + YARD_LINE_SPACING; y += YARD_LINE_SPACING) {
        const ly = y + yardOffset;
        if (ly < -10 || ly > CANVAS_H + 10) continue;

        ctx.strokeStyle = YARD_LINE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(SIDELINE_W, ly);
        ctx.lineTo(CANVAS_W - SIDELINE_W, ly);
        ctx.stroke();

        ctx.strokeStyle = HASH_COLOR;
        ctx.lineWidth = 1;
        const hashPositions = [
          SIDELINE_W + FIELD_W * 0.33,
          SIDELINE_W + FIELD_W * 0.67,
        ];
        for (const hx of hashPositions) {
          ctx.beginPath();
          ctx.moveTo(hx - 4, ly);
          ctx.lineTo(hx + 4, ly);
          ctx.stroke();
        }

        const totalYardLines = Math.floor(fieldOffsetRef.current / YARD_LINE_SPACING);
        const lineIndex = Math.floor((y + YARD_LINE_SPACING) / YARD_LINE_SPACING);
        const yardNum = ((totalYardLines - lineIndex + 100) % 100);
        const displayNum = yardNum % 100;
        const fieldYard = displayNum <= 50 ? displayNum : 100 - displayNum;

        if (fieldYard > 0 && fieldYard % 10 === 0) {
          ctx.save();
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = YARD_NUM_COLOR;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.save();
          ctx.translate(SIDELINE_W + 16, ly);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(fieldYard), 0, 0);
          ctx.restore();

          ctx.save();
          ctx.translate(CANVAS_W - SIDELINE_W - 16, ly);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(String(fieldYard), 0, 0);
          ctx.restore();

          ctx.restore();
        }
      }

      // Endzone detection
      const currentYds = yardsRef.current;
      const nextEndzone = Math.ceil(currentYds / 100) * 100;
      if (nextEndzone - currentYds < 80 && nextEndzone > 0) {
        const endzoneDist = nextEndzone - currentYds;
        const endzoneY = PLAYER_Y - (endzoneDist / 80) * CANVAS_H;
        if (endzoneY > -60 && endzoneY < CANVAS_H) {
          ctx.fillStyle = ENDZONE_COLOR;
          ctx.globalAlpha = 0.25;
          ctx.fillRect(SIDELINE_W, endzoneY - 40, FIELD_W, 40);
          ctx.globalAlpha = 1;

          ctx.font = "bold 24px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("TOUCHDOWN", CANVAS_W / 2, endzoneY - 20);
        }
      }

      // Speed lines
      for (const s of speedLinesRef.current) {
        ctx.strokeStyle = `rgba(255,255,255,${s.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + s.length);
        ctx.stroke();
      }

      // Powerups
      for (const p of powerupsRef.current) {
        const ppx = laneX(p.lane);
        const ppy = p.y;

        ctx.save();
        ctx.shadowColor = POWERUP_COLOR;
        ctx.shadowBlur = 12;

        ctx.fillStyle = POWERUP_COLOR;
        ctx.beginPath();
        ctx.ellipse(ppx, ppy, POWERUP_SIZE / 2, POWERUP_SIZE / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "white";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ppx, ppy - POWERUP_SIZE / 3 + 3);
        ctx.lineTo(ppx, ppy + POWERUP_SIZE / 3 - 3);
        ctx.stroke();
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(ppx - 3, ppy + i * 4);
          ctx.lineTo(ppx + 3, ppy + i * 4);
          ctx.stroke();
        }

        ctx.restore();
      }

      // --- Draw a top-down football player ---
      function drawFootballer(
        cx: number, cy: number,
        jerseyColor: string, helmetColor: string,
        number: string, scale: number, facingUp: boolean,
        glow?: string,
      ) {
        if (!ctx) return;
        ctx.save();
        ctx.translate(cx, cy);
        if (!facingUp) ctx.rotate(Math.PI);
        const s = scale;

        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.beginPath();
        ctx.ellipse(0, 2 * s, 11 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        if (glow) {
          ctx.shadowColor = glow;
          ctx.shadowBlur = 16;
        }

        const legPhase = (frameCountRef.current * 0.2) % (Math.PI * 2);
        const legSpread = Math.sin(legPhase) * 3 * s;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.ellipse(-4 * s, 14 * s + legSpread, 3 * s, 5 * s, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4 * s, 14 * s - legSpread, 3 * s, 5 * s, 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.ellipse(-4 * s, 18 * s + legSpread, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4 * s, 18 * s - legSpread, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = jerseyColor;
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 10 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = jerseyColor;
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -2 * s, 13 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const armSwing = Math.sin(legPhase + Math.PI) * 2 * s;
        ctx.fillStyle = jerseyColor;
        ctx.beginPath();
        ctx.ellipse(-12 * s, 2 * s + armSwing, 3.5 * s, 6 * s, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(12 * s, 2 * s - armSwing, 3.5 * s, 6 * s, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#d4a574";
        ctx.beginPath();
        ctx.arc(-12 * s, 8 * s + armSwing, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12 * s, 8 * s - armSwing, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = helmetColor;
        ctx.beginPath();
        ctx.arc(0, -10 * s, 8 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(200,200,200,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -12 * s, 4 * s, 0.3, Math.PI - 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-3 * s, -13 * s);
        ctx.lineTo(3 * s, -13 * s);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -18 * s);
        ctx.lineTo(0, -3 * s);
        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = `bold ${Math.round(9 * s)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(number, 0, 4 * s);

        ctx.restore();
      }

      // Tacklers
      for (const t of tacklersRef.current) {
        const tlane = t.wide ? Math.min(t.lane, LANE_COUNT - 2) : t.lane;
        const tcx = t.wide
          ? SIDELINE_W + tlane * LANE_W + LANE_W
          : laneX(t.lane);
        const num = String(t.jersey);
        const tacklerScale = t.wide ? 1.15 : 1.0;
        drawFootballer(tcx, t.y, TACKLER_COLOR, "#1a3a5c", num, tacklerScale, true);
      }

      // Player
      const now = Date.now();
      const invincible = now < invincibleUntilRef.current;
      const playerX = laneX(laneRef.current);

      const playerGlow = invincible ? POWERUP_COLOR : PLAYER_GLOW;
      const jerseyCol = invincible ? POWERUP_COLOR : PLAYER_COLOR;
      const helmetCol = invincible ? "#fff8dc" : "#c44a0a";
      drawFootballer(playerX, PLAYER_Y, jerseyCol, helmetCol, "7", 1.1, false, playerGlow);

      // Football in hand
      if (!invincible) {
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.ellipse(playerX + 10, PLAYER_Y + 2, 5, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(playerX + 8, PLAYER_Y + 1);
        ctx.lineTo(playerX + 12, PLAYER_Y + 3);
        ctx.stroke();
      }

      // First down flash with streak display
      if (firstDownFlashRef.current > 0) {
        const flashAlpha = firstDownFlashRef.current / 60;
        ctx.fillStyle = `rgba(221, 85, 12, ${flashAlpha * 0.15})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const rf = 60 - firstDownFlashRef.current;
        const bounceT = rf / 60;
        const tdScale = 1 + Math.sin(bounceT * Math.PI) * 0.2;

        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.scale(tdScale, tdScale);

        // "FIRST DOWN!" text
        const fadeIn = Math.min(rf / 8, 1);
        ctx.globalAlpha = fadeIn * flashAlpha;
        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("FIRST DOWN!", 2, 2);
        ctx.fillStyle = "#FFD700";
        ctx.fillText("FIRST DOWN!", 0, 0);

        // Points earned
        if (rf >= 10) {
          const fadeIn2 = Math.min((rf - 10) / 8, 1);
          ctx.globalAlpha = fadeIn2 * flashAlpha;
          const mult = getStreakMultiplier(streakRef.current);
          const pts = Math.round(100 * mult);
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = mult > 1 ? getMultiplierColor(mult) : "white";
          const ptsText = mult > 1 ? `+${pts} pts (${mult}x)` : `+${pts} pts`;
          ctx.fillText(ptsText, 0, 40);
        }

        // Streak indicator
        if (rf >= 18 && streakRef.current >= 3) {
          const fadeIn3 = Math.min((rf - 18) / 8, 1);
          ctx.globalAlpha = fadeIn3 * flashAlpha;
          const pulse = 1 + Math.sin(frameCountRef.current * 0.1) * 0.075;
          ctx.save();
          ctx.scale(pulse, pulse);
          ctx.font = "bold 18px sans-serif";
          ctx.fillStyle = getMultiplierColor(getStreakMultiplier(streakRef.current));
          ctx.fillText(`x${streakRef.current} STREAK!`, 0, 70);
          ctx.restore();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Pool particles
      drawParticles(ctx, poolRef.current);

      // Flash overlay
      if (flashTimerRef.current > 0) {
        const flashAlpha = flashTimerRef.current / flashMaxTimerRef.current;
        const base = flashColorRef.current.replace(/[\d.]+\)$/, `${(0.15 * flashAlpha).toFixed(3)})`);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // HUD
      if (state === "playing") {
        // Score display (top left)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(14, 8);
        ctx.lineTo(94, 8);
        ctx.quadraticCurveTo(100, 8, 100, 14);
        ctx.lineTo(100, 56);
        ctx.quadraticCurveTo(100, 62, 94, 62);
        ctx.lineTo(14, 62);
        ctx.quadraticCurveTo(8, 62, 8, 56);
        ctx.lineTo(8, 14);
        ctx.quadraticCurveTo(8, 8, 14, 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("SCORE", 16, 12);

        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = PLAYER_COLOR;
        ctx.fillText(String(scoreRef.current), 16, 26);

        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(`${Math.floor(yardsRef.current)} YDS`, 16, 47);

        // Streak HUD (under score, only when active and not in first-down flash)
        if (streakRef.current >= 3 && firstDownFlashRef.current <= 0) {
          const mult = getStreakMultiplier(streakRef.current);
          const pulse = 1 + Math.sin(frameCountRef.current * 0.1) * 0.075;
          ctx.save();
          ctx.translate(54, 76);
          ctx.scale(pulse, pulse);
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`x${streakRef.current} STREAK! ${mult}x`, 0, 0);
          ctx.restore();
        }

        // Invincibility timer
        if (invincible) {
          const remaining = invincibleUntilRef.current - now;
          const barWidth = (remaining / POWERUP_DURATION) * 80;
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(CANVAS_W / 2 - 40, 42, 80, 6);
          ctx.fillStyle = POWERUP_COLOR;
          ctx.fillRect(CANVAS_W / 2 - 40, 42, barWidth, 6);
        }
      }

      // Menu overlay
      if (state === "menu") {
        ctx.fillStyle = "rgba(12, 35, 64, 0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 42px sans-serif";
        ctx.fillStyle = PLAYER_COLOR;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BREAKAWAY", CANVAS_W / 2, CANVAS_H / 2 - 80);

        ctx.font = "18px sans-serif";
        ctx.fillStyle = "white";
        ctx.fillText("Dodge tacklers. Run for glory.", CANVAS_W / 2, CANVAS_H / 2 - 35);

        ctx.fillStyle = PLAYER_COLOR;
        ctx.beginPath();
        ctx.ellipse(CANVAS_W / 2, CANVAS_H / 2 + 20, 25, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, CANVAS_H / 2 + 20 - 14);
        ctx.lineTo(CANVAS_W / 2, CANVAS_H / 2 + 20 + 14);
        ctx.stroke();
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(CANVAS_W / 2 - 5, CANVAS_H / 2 + 20 + i * 5);
          ctx.lineTo(CANVAS_W / 2 + 5, CANVAS_H / 2 + 20 + i * 5);
          ctx.stroke();
        }

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = PLAYER_COLOR;
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 80);
        }

        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("Arrow keys / Swipe to move", CANVAS_W / 2, CANVAS_H / 2 + 110);
      }

      // Game over overlay
      if (state === "gameover") {
        ctx.fillStyle = "rgba(12, 35, 64, 0.88)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("FUMBLE!", CANVAS_W / 2, CANVAS_H / 2 - 80);

        ctx.font = "bold 48px sans-serif";
        ctx.fillStyle = PLAYER_COLOR;
        ctx.fillText(`${scoreRef.current} PTS`, CANVAS_W / 2, CANVAS_H / 2 - 30);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        const firstDowns = Math.floor(yardsRef.current / 100);
        ctx.fillText(
          `${Math.floor(yardsRef.current)} yds | ${firstDowns} first down${firstDowns !== 1 ? "s" : ""}`,
          CANVAS_W / 2,
          CANVAS_H / 2 + 10
        );

        if (streakBrokenRef.current) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#ff4444";
          ctx.fillText("STREAK BROKEN!", CANVAS_W / 2, CANVAS_H / 2 + 35);
        }

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = PLAYER_COLOR;
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 70);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [endGame]);

  // --- Render ---

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Game canvas */}
      <div ref={containerRef} className="flex-1 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border-2 border-white/10 shadow-2xl shadow-black/50 cursor-pointer touch-none"
          style={{ imageRendering: "auto" }}
        />
        {showNameInput && (
          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto mt-3">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveScore()}
              placeholder="Your name"
              maxLength={20}
              className="flex-1 bg-[#0d1b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
            <button
              onClick={handleSaveScore}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase tracking-wide rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        )}
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
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    scoreRank === i + 1 && scoreSaved
                      ? "bg-[#DD550C]/10"
                      : "hover:bg-white/5"
                  } transition-colors`}
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
                    {entry.score.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          )}
          {gameState === "gameover" && scoreSaved && scoreRank && (
            <div className="border-t border-white/10 px-4 py-3 text-center">
              <p className="text-xs text-gray-400">
                You placed <span className="font-bold text-[#DD550C]">#{scoreRank}</span>!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
