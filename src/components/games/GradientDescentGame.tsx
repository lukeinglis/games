"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticlePool, emitParticles, updateParticles, drawParticles, getStreakMultiplier, getMultiplierColor, type Particle } from "@/lib/game-utils";
import { loadLeaderboard, saveToLeaderboard, type LeaderboardEntry } from "@/lib/game-leaderboard";

// ============================================================
// Gradient Descent: A physics marble game
// Guide a ball down a procedurally generated loss landscape
// to find the global minimum. Tap/click to nudge the ball.
// ============================================================

// --- Canvas dimensions ---
const CANVAS_W = 500;
const CANVAS_H = 500;

// --- Grid for terrain ---
const GRID_COLS = 100;
const GRID_ROWS = 100;

// --- Physics ---
const GRAVITY_SCALE = 0.0004;
const FRICTION = 0.985;
const NUDGE_FORCE = 0.06;
const BALL_RADIUS = 6;
const SETTLE_THRESHOLD = 0.0008;
const SETTLE_FRAMES = 90;

// --- Game ---
const MAX_LIVES = 3;
const MAX_NUDGES_PER_LEVEL = 50;

// --- Colors ---
const BG_COLOR = "#0a0e1a";
const BALL_GLOW = "#00ffcc";
const BALL_FILL = "#ffffff";

// --- Types ---
type GamePhase = "menu" | "playing" | "levelComplete" | "dead" | "gameover";

interface TerrainData {
  heights: Float64Array;
  globalMinX: number;
  globalMinY: number;
  globalMinVal: number;
  localMinima: { x: number; y: number }[];
}

const STORAGE_KEY = "portal-gradient-scores";

// --- Terrain generation ---

function generateTerrain(level: number): TerrainData {
  const heights = new Float64Array(GRID_COLS * GRID_ROWS);
  const seed = level * 137.5 + 42;

  // Number of sine layers increases with level
  const numLayers = Math.min(3 + level, 12);
  // More local minima traps as levels progress
  const trapCount = Math.min(Math.floor(level * 1.5), 10);

  // Build layered sine surface
  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const nx = gx / GRID_COLS;
      const ny = gy / GRID_ROWS;
      let h = 0;

      for (let l = 0; l < numLayers; l++) {
        const freq = 1 + l * 1.3;
        const amp = 1 / (1 + l * 0.7);
        const phase = seed * (l + 1) * 0.37;
        h += Math.sin(nx * freq * Math.PI * 2 + phase) * amp;
        h += Math.cos(ny * freq * Math.PI * 2 + phase * 1.3) * amp * 0.8;
        h += Math.sin((nx + ny) * freq * Math.PI * 1.5 + phase * 0.7) * amp * 0.5;
      }

      // Add a broad basin toward center-ish (shifts with level)
      const cx = 0.3 + (((seed * 3.7) % 100) / 100) * 0.4;
      const cy = 0.3 + (((seed * 5.3) % 100) / 100) * 0.4;
      const distCenter = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
      h += distCenter * 3;

      // Add trap wells (local minima)
      for (let t = 0; t < trapCount; t++) {
        const tx = 0.1 + (((seed * (t + 2) * 1.7) % 100) / 100) * 0.8;
        const ty = 0.1 + (((seed * (t + 2) * 2.3) % 100) / 100) * 0.8;
        const distTrap = Math.sqrt((nx - tx) * (nx - tx) + (ny - ty) * (ny - ty));
        const trapDepth = 0.8 + (t % 3) * 0.3;
        const trapWidth = 0.04 + (level > 5 ? 0.01 : 0.02);
        if (distTrap < trapWidth * 3) {
          h -= trapDepth * Math.exp(-(distTrap * distTrap) / (2 * trapWidth * trapWidth));
        }
      }

      // Edge walls to keep ball in bounds
      const edgeDist = Math.min(nx, ny, 1 - nx, 1 - ny);
      if (edgeDist < 0.08) {
        h += (0.08 - edgeDist) * 40;
      }

      heights[gy * GRID_COLS + gx] = h;
    }
  }

  // Find global minimum
  let globalMinVal = Infinity;
  let globalMinX = 0;
  let globalMinY = 0;
  // Exclude edge zone from global min search
  for (let gy = 8; gy < GRID_ROWS - 8; gy++) {
    for (let gx = 8; gx < GRID_COLS - 8; gx++) {
      const val = heights[gy * GRID_COLS + gx];
      if (val < globalMinVal) {
        globalMinVal = val;
        globalMinX = gx;
        globalMinY = gy;
      }
    }
  }

  // Find local minima (points lower than all 8 neighbors)
  const localMinima: { x: number; y: number }[] = [];
  for (let gy = 2; gy < GRID_ROWS - 2; gy++) {
    for (let gx = 2; gx < GRID_COLS - 2; gx++) {
      const val = heights[gy * GRID_COLS + gx];
      let isMin = true;
      for (let dy = -1; dy <= 1 && isMin; dy++) {
        for (let dx = -1; dx <= 1 && isMin; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (heights[(gy + dy) * GRID_COLS + (gx + dx)] <= val) {
            isMin = false;
          }
        }
      }
      if (isMin && !(gx === globalMinX && gy === globalMinY)) {
        // Only add if far enough from global min and other local mins
        const distToGlobal = Math.sqrt((gx - globalMinX) ** 2 + (gy - globalMinY) ** 2);
        if (distToGlobal > 5) {
          localMinima.push({ x: gx, y: gy });
        }
      }
    }
  }

  return { heights, globalMinX, globalMinY, globalMinVal, localMinima };
}

function getHeight(terrain: TerrainData, gx: number, gy: number): number {
  const ix = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(gx)));
  const iy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(gy)));
  return terrain.heights[iy * GRID_COLS + ix];
}

function getGradient(terrain: TerrainData, gx: number, gy: number): { dx: number; dy: number } {
  const h = getHeight(terrain, gx, gy);
  const hx = getHeight(terrain, gx + 1, gy);
  const hy = getHeight(terrain, gx, gy + 1);
  return { dx: hx - h, dy: hy - h };
}

// Convert grid coords to canvas coords
function gridToCanvas(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx / GRID_COLS) * CANVAS_W,
    y: (gy / GRID_ROWS) * CANVAS_H,
  };
}

// Convert canvas coords to grid coords
function canvasToGrid(cx: number, cy: number): { gx: number; gy: number } {
  return {
    gx: (cx / CANVAS_W) * GRID_COLS,
    gy: (cy / CANVAS_H) * GRID_ROWS,
  };
}

// --- Heatmap color ---
function heightToColor(h: number, minH: number, maxH: number): string {
  const t = Math.max(0, Math.min(1, (h - minH) / (maxH - minH)));
  // Deep blue -> cyan -> green -> yellow -> orange -> red
  const r = Math.floor(t < 0.5 ? t * 2 * 80 : 80 + (t - 0.5) * 2 * 175);
  const g = Math.floor(
    t < 0.25 ? 20 + t * 4 * 180
    : t < 0.6 ? 200 - (t - 0.25) * (200 / 0.35)
    : 20 + (t - 0.6) * (80 / 0.4)
  );
  const b = Math.floor(t < 0.4 ? 200 - t * 2.5 * 150 : 50 - (t - 0.4) * 50);
  return `rgb(${r},${g},${b})`;
}

// Pre-render the terrain to an offscreen canvas
function renderTerrainToCanvas(terrain: TerrainData): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  offscreen.width = CANVAS_W;
  offscreen.height = CANVAS_H;
  const ctx = offscreen.getContext("2d")!;

  // Find height range
  let minH = Infinity;
  let maxH = -Infinity;
  for (let i = 0; i < terrain.heights.length; i++) {
    if (terrain.heights[i] < minH) minH = terrain.heights[i];
    if (terrain.heights[i] > maxH) maxH = terrain.heights[i];
  }

  const cellW = CANVAS_W / GRID_COLS;
  const cellH = CANVAS_H / GRID_ROWS;

  for (let gy = 0; gy < GRID_ROWS; gy++) {
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const h = terrain.heights[gy * GRID_COLS + gx];
      ctx.fillStyle = heightToColor(h, minH, maxH);
      ctx.fillRect(gx * cellW, gy * cellH, cellW + 1, cellH + 1);
    }
  }

  // Draw contour lines
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 0.5;
  const range = maxH - minH;
  const contourCount = 12;
  for (let c = 0; c < contourCount; c++) {
    const threshold = minH + (c / contourCount) * range;
    for (let gy = 0; gy < GRID_ROWS - 1; gy++) {
      for (let gx = 0; gx < GRID_COLS - 1; gx++) {
        const h00 = terrain.heights[gy * GRID_COLS + gx];
        const h10 = terrain.heights[gy * GRID_COLS + gx + 1];
        const h01 = terrain.heights[(gy + 1) * GRID_COLS + gx];
        // Simple contour: check if threshold crosses between adjacent cells
        if ((h00 < threshold && h10 >= threshold) || (h00 >= threshold && h10 < threshold)) {
          const x = (gx + 0.5) * cellW;
          const y = (gy + 0.5) * cellH;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y);
          ctx.stroke();
        }
        if ((h00 < threshold && h01 >= threshold) || (h00 >= threshold && h01 < threshold)) {
          const x = (gx + 0.5) * cellW;
          const y = (gy + 0.5) * cellH;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellH);
          ctx.stroke();
        }
      }
    }
  }

  return offscreen;
}

// --- Round rect helper ---
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
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

// --- Component ---

export default function GradientDescentGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs
  const phaseRef = useRef<GamePhase>("menu");
  const levelRef = useRef(1);
  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);
  const nudgesRef = useRef(0);
  const totalNudgesRef = useRef(0);
  const levelStartTimeRef = useRef(0);
  const levelTimeRef = useRef(0);

  // Ball state
  const ballGxRef = useRef(0);
  const ballGyRef = useRef(0);
  const ballVxRef = useRef(0);
  const ballVyRef = useRef(0);

  // Settle detection
  const settleCountRef = useRef(0);
  const stuckCountRef = useRef(0);

  // Terrain
  const terrainRef = useRef<TerrainData | null>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Particles
  const particlesRef = useRef<Particle[]>(createParticlePool());

  // Trail (fixed pool: positions stored in ring buffer)
  const trailRef = useRef<{ x: number; y: number; active: boolean }[]>(
    Array.from({ length: 60 }, () => ({ x: 0, y: 0, active: false }))
  );
  const trailIdxRef = useRef(0);
  const trailFrameRef = useRef(0);

  // Screen effects
  const shakeIntensityRef = useRef(0);
  const shakeTimerRef = useRef(0);
  const shakeMaxTimerRef = useRef(0);
  const flashColorRef = useRef("");
  const flashTimerRef = useRef(0);
  const flashMaxTimerRef = useRef(0);

  // Streak
  const streakRef = useRef(0);

  // Level complete delay
  const levelCompleteTimerRef = useRef(0);

  // Death delay
  const deathTimerRef = useRef(0);

  // Animation
  const animFrameRef = useRef(0);
  const frameCountRef = useRef(0);
  const scaleRef = useRef(1);

  // React state for overlay UI
  const [, setGamePhase] = useState<GamePhase>("menu");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard(STORAGE_KEY));
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const showNameInputRef = useRef(false);

  // --- Terrain + level setup ---

  const setupLevel = useCallback((level: number) => {
    const terrain = generateTerrain(level);
    terrainRef.current = terrain;
    terrainCanvasRef.current = renderTerrainToCanvas(terrain);

    // Place ball at a starting position (top area, away from global min)
    // For first few levels, place near edge of map opposite to global min
    const gmx = terrain.globalMinX / GRID_COLS;
    const gmy = terrain.globalMinY / GRID_ROWS;
    let startGx: number;
    let startGy: number;

    if (gmx < 0.5) {
      startGx = GRID_COLS * (0.7 + Math.random() * 0.15);
    } else {
      startGx = GRID_COLS * (0.15 + Math.random() * 0.15);
    }
    if (gmy < 0.5) {
      startGy = GRID_ROWS * (0.7 + Math.random() * 0.15);
    } else {
      startGy = GRID_ROWS * (0.15 + Math.random() * 0.15);
    }

    ballGxRef.current = startGx;
    ballGyRef.current = startGy;
    ballVxRef.current = 0;
    ballVyRef.current = 0;
    nudgesRef.current = 0;
    settleCountRef.current = 0;
    stuckCountRef.current = 0;
    levelStartTimeRef.current = Date.now();
    levelTimeRef.current = 0;

    // Reset trail
    for (let i = 0; i < trailRef.current.length; i++) {
      trailRef.current[i].active = false;
    }
    trailIdxRef.current = 0;
    trailFrameRef.current = 0;

    // Reset particles
    for (let i = 0; i < particlesRef.current.length; i++) {
      particlesRef.current[i].active = false;
    }
  }, []);

  const startGame = useCallback(() => {
    levelRef.current = 1;
    livesRef.current = MAX_LIVES;
    scoreRef.current = 0;
    totalNudgesRef.current = 0;
    streakRef.current = 0;
    shakeIntensityRef.current = 0;
    shakeTimerRef.current = 0;
    flashTimerRef.current = 0;
    levelCompleteTimerRef.current = 0;
    deathTimerRef.current = 0;
    setShowNameInput(false);
    showNameInputRef.current = false;
    setPlayerName("");

    setupLevel(1);
    phaseRef.current = "playing";
    setGamePhase("playing");
  }, [setupLevel]);

  const endGame = useCallback(() => {
    phaseRef.current = "gameover";
    setGamePhase("gameover");

    const finalScore = scoreRef.current;
    if (finalScore > 0) {
      setShowNameInput(true);
      showNameInputRef.current = true;
    }
  }, []);

  const handleSaveScore = useCallback(() => {
    const name = playerName.trim() || "Anonymous";
    const finalScore = scoreRef.current;
    saveToLeaderboard(STORAGE_KEY, name, finalScore);
    setLeaderboard(loadLeaderboard(STORAGE_KEY));
    setShowNameInput(false);
    showNameInputRef.current = false;
  }, [playerName]);

  // --- Input: nudge ball toward click/tap point ---

  const handleCanvasInput = useCallback((canvasX: number, canvasY: number) => {
    const phase = phaseRef.current;
    if (phase === "menu" || (phase === "gameover" && !showNameInputRef.current)) {
      startGame();
      return;
    }
    if (phase !== "playing") return;
    if (nudgesRef.current >= MAX_NUDGES_PER_LEVEL) return;

    const target = canvasToGrid(canvasX, canvasY);
    const dx = target.gx - ballGxRef.current;
    const dy = target.gy - ballGyRef.current;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // Nudge force decreases with level
    const forceMult = Math.max(0.5, 1 - (levelRef.current - 1) * 0.03);
    ballVxRef.current += nx * NUDGE_FORCE * forceMult;
    ballVyRef.current += ny * NUDGE_FORCE * forceMult;
    nudgesRef.current++;
    totalNudgesRef.current++;
    settleCountRef.current = 0;
    stuckCountRef.current = 0;

    // Nudge particle burst
    const ballCanvas = gridToCanvas(ballGxRef.current, ballGyRef.current);
    emitParticles(particlesRef.current, 6, ballCanvas.x, ballCanvas.y, {
      speedMin: 1, speedMax: 3, lifeFrames: 20,
      colors: [BALL_GLOW, "#00aaff", "#ffffff"], sizeMin: 1, sizeMax: 3,
    });
  }, [startGame]);

  // --- Input handlers ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      const sx = CANVAS_W / rect.width;
      const sy = CANVAS_H / rect.height;
      return {
        x: (clientX - rect.left) * sx,
        y: (clientY - rect.top) * sy,
      };
    }

    function onClick(e: MouseEvent) {
      e.preventDefault();
      const coords = getCanvasCoords(e.clientX, e.clientY);
      handleCanvasInput(coords.x, coords.y);
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length > 0) {
        const coords = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        handleCanvasInput(coords.x, coords.y);
      }
    }

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, [handleCanvasInput]);

  // Keyboard: space/enter for menu/gameover
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const phase = phaseRef.current;
        if (phase === "menu" || (phase === "gameover" && !showNameInputRef.current)) {
          startGame();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame]);

  // --- Resize ---

  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const maxW = container.clientWidth;
      const maxH = Math.min(500, window.innerHeight * 0.7);
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
      const terrain = terrainRef.current;

      // --- Update ---

      if (phase === "playing" && terrain) {
        // Physics: gradient descent with momentum
        const grad = getGradient(terrain, ballGxRef.current, ballGyRef.current);
        const gravityMult = GRAVITY_SCALE * (1 + levelRef.current * 0.15);

        ballVxRef.current -= grad.dx * gravityMult;
        ballVyRef.current -= grad.dy * gravityMult;

        // Apply friction
        ballVxRef.current *= FRICTION;
        ballVyRef.current *= FRICTION;

        // Update position
        ballGxRef.current += ballVxRef.current;
        ballGyRef.current += ballVyRef.current;

        // Clamp to bounds with bounce
        if (ballGxRef.current < 1) {
          ballGxRef.current = 1;
          ballVxRef.current = Math.abs(ballVxRef.current) * 0.5;
        }
        if (ballGxRef.current > GRID_COLS - 2) {
          ballGxRef.current = GRID_COLS - 2;
          ballVxRef.current = -Math.abs(ballVxRef.current) * 0.5;
        }
        if (ballGyRef.current < 1) {
          ballGyRef.current = 1;
          ballVyRef.current = Math.abs(ballVyRef.current) * 0.5;
        }
        if (ballGyRef.current > GRID_ROWS - 2) {
          ballGyRef.current = GRID_ROWS - 2;
          ballVyRef.current = -Math.abs(ballVyRef.current) * 0.5;
        }

        // Update trail (ring buffer, every 2 frames)
        trailFrameRef.current++;
        if (trailFrameRef.current % 2 === 0) {
          const bc = gridToCanvas(ballGxRef.current, ballGyRef.current);
          const idx = trailIdxRef.current % trailRef.current.length;
          trailRef.current[idx].x = bc.x;
          trailRef.current[idx].y = bc.y;
          trailRef.current[idx].active = true;
          trailIdxRef.current++;
        }

        // Check if ball settled
        const speed = Math.sqrt(ballVxRef.current ** 2 + ballVyRef.current ** 2);
        if (speed < SETTLE_THRESHOLD) {
          settleCountRef.current++;
        } else {
          settleCountRef.current = 0;
        }

        // Check if at global minimum
        const distToGoal = Math.sqrt(
          (ballGxRef.current - terrain.globalMinX) ** 2 +
          (ballGyRef.current - terrain.globalMinY) ** 2
        );

        if (distToGoal < 3 && settleCountRef.current > 20) {
          // Level complete!
          levelTimeRef.current = (Date.now() - levelStartTimeRef.current) / 1000;
          phaseRef.current = "levelComplete";
          setGamePhase("levelComplete");
          levelCompleteTimerRef.current = 90;

          // Score: base points for level, bonus for speed and few nudges
          const timeBonus = Math.max(0, Math.floor(60 - levelTimeRef.current)) * 5;
          const nudgeBonus = Math.max(0, MAX_NUDGES_PER_LEVEL - nudgesRef.current) * 2;
          const levelBase = levelRef.current * 100;
          const mult = getStreakMultiplier(streakRef.current + 1);
          const levelScore = Math.round((levelBase + timeBonus + nudgeBonus) * mult);
          scoreRef.current += levelScore;
          streakRef.current++;

          // Effects
          const goalCanvas = gridToCanvas(terrain.globalMinX, terrain.globalMinY);
          emitParticles(particlesRef.current, 60, goalCanvas.x, goalCanvas.y, {
            speedMin: 2, speedMax: 6, lifeFrames: 50,
            colors: ["#00ff88", "#00ffcc", "#ffffff", "#FFD700"], sizeMin: 2, sizeMax: 5,
          });
          shakeIntensityRef.current = 8;
          shakeTimerRef.current = 15;
          shakeMaxTimerRef.current = 15;
          flashColorRef.current = "green";
          flashTimerRef.current = 20;
          flashMaxTimerRef.current = 20;
        } else if (settleCountRef.current >= SETTLE_FRAMES && distToGoal > 5) {
          // Settled in a local minimum (stuck)
          stuckCountRef.current++;
          if (stuckCountRef.current >= 2) {
            // Second time settling in wrong spot = death
            phaseRef.current = "dead";
            setGamePhase("dead");
            deathTimerRef.current = 60;
            livesRef.current--;
            streakRef.current = 0;

            const bc = gridToCanvas(ballGxRef.current, ballGyRef.current);
            emitParticles(particlesRef.current, 40, bc.x, bc.y, {
              speedMin: 2, speedMax: 5, lifeFrames: 40,
              colors: ["#ff4444", "#ff8800", "#ffcc00"], sizeMin: 2, sizeMax: 4,
            });
            shakeIntensityRef.current = 6;
            shakeTimerRef.current = 12;
            shakeMaxTimerRef.current = 12;
            flashColorRef.current = "red";
            flashTimerRef.current = 15;
            flashMaxTimerRef.current = 15;
          } else {
            // First time stuck: just reset settle counter (player can nudge)
            settleCountRef.current = 0;
          }
        }

        // Too many nudges used = death
        if (nudgesRef.current >= MAX_NUDGES_PER_LEVEL && speed < SETTLE_THRESHOLD * 5 && distToGoal > 5) {
          stuckCountRef.current++;
          if (stuckCountRef.current >= 2) {
            phaseRef.current = "dead";
            setGamePhase("dead");
            deathTimerRef.current = 60;
            livesRef.current--;
            streakRef.current = 0;

            const bc = gridToCanvas(ballGxRef.current, ballGyRef.current);
            emitParticles(particlesRef.current, 40, bc.x, bc.y, {
              speedMin: 2, speedMax: 5, lifeFrames: 40,
              colors: ["#ff4444", "#ff8800"], sizeMin: 2, sizeMax: 4,
            });
            shakeIntensityRef.current = 6;
            shakeTimerRef.current = 12;
            shakeMaxTimerRef.current = 12;
            flashColorRef.current = "red";
            flashTimerRef.current = 15;
            flashMaxTimerRef.current = 15;
          }
        }

        // Overall stuck timeout
        if (phase === "playing") {
          const elapsed = (Date.now() - levelStartTimeRef.current) / 1000;
          if (elapsed > 120) {
            // 2 minute timeout
            phaseRef.current = "dead";
            setGamePhase("dead");
            deathTimerRef.current = 60;
            livesRef.current--;
            streakRef.current = 0;

            flashColorRef.current = "red";
            flashTimerRef.current = 15;
            flashMaxTimerRef.current = 15;
          }
        }
      }

      // Level complete timer
      if (phase === "levelComplete") {
        levelCompleteTimerRef.current--;
        if (levelCompleteTimerRef.current <= 0) {
          levelRef.current++;
          setupLevel(levelRef.current);
          phaseRef.current = "playing";
          setGamePhase("playing");
        }
      }

      // Death timer
      if (phase === "dead") {
        deathTimerRef.current--;
        if (deathTimerRef.current <= 0) {
          if (livesRef.current <= 0) {
            endGame();
          } else {
            // Retry same level
            setupLevel(levelRef.current);
            phaseRef.current = "playing";
            setGamePhase("playing");
          }
        }
      }

      // Update particles
      updateParticles(particlesRef.current);

      // Update screen shake
      if (shakeTimerRef.current > 0) shakeTimerRef.current--;
      if (flashTimerRef.current > 0) flashTimerRef.current--;

      // --- Draw ---
      ctx.save();

      // Screen shake
      if (shakeTimerRef.current > 0) {
        const ratio = shakeTimerRef.current / shakeMaxTimerRef.current;
        const shakeX = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        const shakeY = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        ctx.translate(shakeX, shakeY);
      }

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw terrain
      if (terrainCanvasRef.current) {
        ctx.drawImage(terrainCanvasRef.current, 0, 0);
      }

      if (terrain && (phase === "playing" || phase === "levelComplete" || phase === "dead")) {
        // Draw global minimum marker
        const goalPos = gridToCanvas(terrain.globalMinX, terrain.globalMinY);
        const pulse = Math.sin(frameCountRef.current * 0.08) * 0.3 + 0.7;

        // Pulsing ring
        ctx.strokeStyle = `rgba(0,255,136,${pulse * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(goalPos.x, goalPos.y, 12 + Math.sin(frameCountRef.current * 0.05) * 3, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const goalGlow = ctx.createRadialGradient(goalPos.x, goalPos.y, 0, goalPos.x, goalPos.y, 8);
        goalGlow.addColorStop(0, `rgba(0,255,136,${pulse * 0.5})`);
        goalGlow.addColorStop(1, "rgba(0,255,136,0)");
        ctx.fillStyle = goalGlow;
        ctx.beginPath();
        ctx.arc(goalPos.x, goalPos.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Star marker
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.fillText("★", goalPos.x, goalPos.y);

        // Draw local minima traps (subtle warning markers)
        for (let i = 0; i < terrain.localMinima.length; i++) {
          const lm = terrain.localMinima[i];
          const lmPos = gridToCanvas(lm.x, lm.y);
          const trapPulse = Math.sin(frameCountRef.current * 0.06 + i) * 0.2 + 0.3;
          ctx.strokeStyle = `rgba(255,100,50,${trapPulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(lmPos.x, lmPos.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw ball trail
        const trail = trailRef.current;
        const trailLen = trail.length;
        const currentIdx = trailIdxRef.current;
        for (let i = 0; i < trailLen; i++) {
          // Read in order from oldest to newest
          const idx = (currentIdx + i) % trailLen;
          if (!trail[idx].active) continue;
          const age = (trailLen - i) / trailLen;
          const alpha = (1 - age) * 0.4;
          const sz = (1 - age) * 3 + 1;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = BALL_GLOW;
          ctx.beginPath();
          ctx.arc(trail[idx].x, trail[idx].y, sz, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw ball
        const ballCanvas = gridToCanvas(ballGxRef.current, ballGyRef.current);

        // Glow
        const ballGlowGrad = ctx.createRadialGradient(
          ballCanvas.x, ballCanvas.y, 0,
          ballCanvas.x, ballCanvas.y, BALL_RADIUS * 3,
        );
        ballGlowGrad.addColorStop(0, "rgba(0,255,204,0.4)");
        ballGlowGrad.addColorStop(1, "rgba(0,255,204,0)");
        ctx.fillStyle = ballGlowGrad;
        ctx.beginPath();
        ctx.arc(ballCanvas.x, ballCanvas.y, BALL_RADIUS * 3, 0, Math.PI * 2);
        ctx.fill();

        // Ball body
        const ballGrad = ctx.createRadialGradient(
          ballCanvas.x - 2, ballCanvas.y - 2, 0,
          ballCanvas.x, ballCanvas.y, BALL_RADIUS,
        );
        ballGrad.addColorStop(0, "#ffffff");
        ballGrad.addColorStop(1, "#88ddcc");
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(ballCanvas.x, ballCanvas.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Ball outline
        ctx.strokeStyle = BALL_GLOW;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ballCanvas.x, ballCanvas.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Particles ---
      drawParticles(ctx, particlesRef.current);

      // --- HUD ---
      if (phase !== "menu" && phase !== "gameover") {
        // Top bar background
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        drawRoundRect(ctx, 8, 8, CANVAS_W - 16, 36, 6);
        ctx.fill();

        // Level
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#00ffcc";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`LVL ${levelRef.current}`, 18, 26);

        // Score
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.textAlign = "center";
        ctx.fillText(`${scoreRef.current} PTS`, CANVAS_W / 2, 26);

        // Lives
        ctx.textAlign = "right";
        ctx.font = "12px sans-serif";
        for (let i = 0; i < MAX_LIVES; i++) {
          const lx = CANVAS_W - 20 - i * 18;
          ctx.fillStyle = i < livesRef.current ? "#00ff88" : "rgba(255,100,100,0.3)";
          ctx.beginPath();
          ctx.arc(lx, 26, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nudges left
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        drawRoundRect(ctx, 8, 48, 90, 22, 4);
        ctx.fill();
        const nudgesLeft = MAX_NUDGES_PER_LEVEL - nudgesRef.current;
        ctx.font = "bold 10px sans-serif";
        ctx.fillStyle = nudgesLeft <= 10 ? "#ff6666" : "rgba(255,255,255,0.7)";
        ctx.textAlign = "left";
        ctx.fillText(`NUDGES: ${nudgesLeft}`, 16, 59);

        // Streak
        if (streakRef.current >= 3) {
          const mult = getStreakMultiplier(streakRef.current);
          const sp = 1 + Math.sin(frameCountRef.current * 0.1) * 0.05;
          ctx.save();
          ctx.translate(CANVAS_W / 2, 50);
          ctx.scale(sp, sp);
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`x${streakRef.current} STREAK ${mult}x`, 0, 0);
          ctx.restore();
        }

        // Timer
        if (phase === "playing") {
          const elapsed = (Date.now() - levelStartTimeRef.current) / 1000;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          drawRoundRect(ctx, CANVAS_W - 80, 48, 72, 22, 4);
          ctx.fill();
          ctx.font = "bold 10px sans-serif";
          ctx.fillStyle = elapsed > 90 ? "#ff6666" : "rgba(255,255,255,0.7)";
          ctx.textAlign = "right";
          ctx.fillText(`${elapsed.toFixed(1)}s`, CANVAS_W - 16, 59);
        }

        // Instructions
        if (phase === "playing" && frameCountRef.current < 180 && levelRef.current === 1) {
          const fadeOut = Math.max(0, 1 - (frameCountRef.current - 120) / 60);
          if (fadeOut > 0) {
            ctx.globalAlpha = fadeOut * 0.8;
            ctx.font = "bold 13px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText("Tap to nudge the ball toward the green star", CANVAS_W / 2, CANVAS_H - 20);
            ctx.globalAlpha = 1;
          }
        }
      }

      // --- Level Complete overlay ---
      if (phase === "levelComplete") {
        const alpha = Math.min(1, (90 - levelCompleteTimerRef.current) / 15);
        ctx.fillStyle = `rgba(0,20,10,${alpha * 0.6})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.globalAlpha = alpha;

        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = "#00ff88";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MINIMUM FOUND!", CANVAS_W / 2, CANVAS_H / 2 - 50);

        ctx.font = "bold 18px sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`Level ${levelRef.current} Complete`, CANVAS_W / 2, CANVAS_H / 2 - 10);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(
          `Time: ${levelTimeRef.current.toFixed(1)}s | Nudges: ${nudgesRef.current}`,
          CANVAS_W / 2, CANVAS_H / 2 + 25
        );

        const mult = getStreakMultiplier(streakRef.current);
        if (mult > 1) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.fillText(`${mult}x Streak Bonus!`, CANVAS_W / 2, CANVAS_H / 2 + 55);
        }

        ctx.globalAlpha = 1;
      }

      // --- Death overlay ---
      if (phase === "dead") {
        const alpha = Math.min(1, (60 - deathTimerRef.current) / 10);
        ctx.fillStyle = `rgba(30,0,0,${alpha * 0.6})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.globalAlpha = alpha;

        ctx.font = "bold 30px sans-serif";
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STUCK IN LOCAL MINIMUM!", CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        if (livesRef.current > 0) {
          ctx.fillText(`${livesRef.current} ${livesRef.current === 1 ? "life" : "lives"} remaining`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        } else {
          ctx.fillText("No lives remaining...", CANVAS_W / 2, CANVAS_H / 2 + 20);
        }

        ctx.globalAlpha = 1;
      }

      // --- Flash overlay ---
      if (flashTimerRef.current > 0) {
        const fa = flashTimerRef.current / flashMaxTimerRef.current;
        if (flashColorRef.current === "green") {
          ctx.fillStyle = `rgba(0,255,100,${fa * 0.15})`;
        } else if (flashColorRef.current === "red") {
          ctx.fillStyle = `rgba(255,0,0,${fa * 0.15})`;
        }
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // --- Menu overlay ---
      if (phase === "menu") {
        ctx.fillStyle = "rgba(10,14,26,0.92)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Title
        ctx.font = "bold 34px sans-serif";
        ctx.fillStyle = "#00ffcc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GRADIENT", CANVAS_W / 2, CANVAS_H / 2 - 100);
        ctx.fillText("DESCENT", CANVAS_W / 2, CANVAS_H / 2 - 60);

        // Subtitle
        ctx.font = "15px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText("Find the global minimum.", CANVAS_W / 2, CANVAS_H / 2 - 20);

        // Icon: draw a simple landscape with ball
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const iconY = CANVAS_H / 2 + 30;
        for (let i = 0; i < 80; i++) {
          const x = CANVAS_W / 2 - 40 + i;
          const y = iconY + Math.sin(i * 0.15) * 8 + Math.sin(i * 0.08 + 2) * 5;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Ball on the landscape
        ctx.fillStyle = BALL_FILL;
        ctx.beginPath();
        ctx.arc(CANVAS_W / 2 - 20, iconY + Math.sin(20 * 0.15) * 8 + Math.sin(20 * 0.08 + 2) * 5 - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Star at minimum
        ctx.fillStyle = "#00ff88";
        ctx.font = "12px sans-serif";
        ctx.fillText("★", CANVAS_W / 2 + 18, iconY + Math.sin(58 * 0.15) * 8 + Math.sin(58 * 0.08 + 2) * 5 - 6);

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "#00ffcc";
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 80);
        }

        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText("3 lives. Avoid local minima traps.", CANVAS_W / 2, CANVAS_H / 2 + 110);
      }

      // --- Game Over overlay ---
      if (phase === "gameover") {
        ctx.fillStyle = "rgba(10,14,26,0.92)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 36px sans-serif";
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 70);

        ctx.font = "bold 48px sans-serif";
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`${scoreRef.current}`, CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(
          `Reached Level ${levelRef.current} | ${totalNudgesRef.current} total nudges`,
          CANVAS_W / 2, CANVAS_H / 2 + 15
        );

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "#00ffcc";
          ctx.fillText("TAP or PRESS SPACE", CANVAS_W / 2, CANVAS_H / 2 + 65);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [endGame, setupLevel]);

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
        <div className="rounded-xl border border-white/10 bg-[#0d1b2a] overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h3 className="font-[family-name:var(--font-heading)] text-sm font-semibold uppercase tracking-wide text-[#00ffcc]">
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
                        ? "bg-[#00ffcc] text-black"
                        : i < 3
                        ? "bg-[#00ffcc]/50 text-white"
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
                  <span className="font-[family-name:var(--font-heading)] text-sm font-bold text-[#FFD700]">
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
