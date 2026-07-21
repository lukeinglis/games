"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParticlePool, emitParticles, updateParticles, drawParticles, type Particle } from "@/lib/game-utils";
import { loadLeaderboard, saveToLeaderboard, type LeaderboardEntry } from "@/lib/game-leaderboard";

// ============================================================
// Overfit!  A bias-variance tradeoff game
// Draw a curve through data points. Too simple = underfit.
// Too wiggly = overfit. Find the sweet spot for the best score.
// ============================================================

// --- Canvas dimensions ---
const CANVAS_W = 560;
const CANVAS_H = 480;

// --- Plot area (inside the canvas) ---
const PLOT_LEFT = 60;
const PLOT_TOP = 50;
const PLOT_RIGHT = CANVAS_W - 30;
const PLOT_BOTTOM = CANVAS_H - 50;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

// --- Colors ---
const BG_COLOR = "#2E3440";
const GRID_COLOR = "rgba(100, 200, 255, 0.08)";
const AXIS_COLOR = "rgba(100, 200, 255, 0.25)";
const POINT_COLOR = "#00e5ff";
const POINT_GLOW = "rgba(0, 229, 255, 0.3)";
const CURVE_COLOR = "#B48EAD";
const TRUE_CURVE_COLOR = "#A3BE8C";
const TRUE_CURVE_GLOW = "rgba(0, 230, 118, 0.25)";
const LABEL_COLOR = "rgba(180, 220, 255, 0.6)";
const TEAL = "#8FBCBB";
const PINK = "#B48EAD";
const RED = "#ff4444";
const GREEN = "#A3BE8C";

// --- True function generators ---
type TrueFunction = (x: number) => number;

function makeTrueFunction(round: number, seed: number): TrueFunction {
  const rng = mulberry32(seed);

  if (round <= 1) {
    // Simple linear
    const slope = 0.3 + rng() * 0.6;
    const intercept = 0.2 + rng() * 0.3;
    return (x: number) => intercept + slope * x;
  } else if (round <= 3) {
    // Quadratic
    const a = -0.8 + rng() * 1.6;
    const b = 0.3 + rng() * 0.4;
    const c = 0.2 + rng() * 0.3;
    return (x: number) => c + b * x + a * x * x;
  } else if (round <= 5) {
    // Cubic
    const a = -1.5 + rng() * 3;
    const b = -0.5 + rng() * 1;
    const c = 0.3 + rng() * 0.4;
    const d = 0.3 + rng() * 0.3;
    return (x: number) => d + c * x + b * x * x + a * x * x * x;
  } else {
    // Sinusoidal with linear trend
    const freq = 1 + rng() * 2;
    const amp = 0.1 + rng() * 0.2;
    const slope = 0.2 + rng() * 0.4;
    const offset = 0.3 + rng() * 0.2;
    return (x: number) => offset + slope * x + amp * Math.sin(freq * Math.PI * x);
  }
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Generate data points ---
interface DataPoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
}

function generatePoints(round: number, trueFn: TrueFunction, seed: number): DataPoint[] {
  const rng = mulberry32(seed + 9999);
  const count = Math.min(8 + round, 15);
  const noise = 0.04 + Math.min(round * 0.015, 0.1);
  const points: DataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const x = 0.05 + (i / (count - 1)) * 0.9;
    const jitterX = x + (rng() - 0.5) * 0.04;
    const clampedX = Math.max(0.02, Math.min(0.98, jitterX));
    let y = trueFn(clampedX) + (rng() - 0.5) * 2 * noise;
    y = Math.max(0.05, Math.min(0.95, y));
    points.push({ x: clampedX, y });
  }

  return points;
}

// --- Coordinate conversions ---
function dataToCanvas(px: number, py: number): [number, number] {
  return [
    PLOT_LEFT + px * PLOT_W,
    PLOT_BOTTOM - py * PLOT_H,
  ];
}

function canvasToData(cx: number, cy: number): [number, number] {
  return [
    (cx - PLOT_LEFT) / PLOT_W,
    (PLOT_BOTTOM - cy) / PLOT_H,
  ];
}

// --- Scoring ---
function computeScore(
  drawnPath: Array<{ x: number; y: number }>,
  dataPoints: DataPoint[],
): { score: number; mse: number; curvature: number; label: string; labelColor: string } {
  if (drawnPath.length < 3) {
    return { score: 0, mse: 1, curvature: 0, label: "DRAW MORE!", labelColor: RED };
  }

  // Sort path by x for consistent sampling
  const sorted = [...drawnPath].sort((a, b) => a.x - b.x);

  // Compute MSE: for each data point, find closest y on the drawn curve
  let totalSqErr = 0;
  for (const dp of dataPoints) {
    // Find two path points bracketing dp.x and interpolate
    let closestY = sorted[0].y;
    let minDist = Infinity;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].x <= dp.x && sorted[i + 1].x >= dp.x) {
        const t = (dp.x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x + 1e-9);
        closestY = sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
        minDist = 0;
        break;
      }
      const d1 = Math.abs(sorted[i].x - dp.x);
      const d2 = Math.abs(sorted[i + 1].x - dp.x);
      if (d1 < minDist) { minDist = d1; closestY = sorted[i].y; }
      if (d2 < minDist) { minDist = d2; closestY = sorted[i + 1].y; }
    }
    const err = dp.y - closestY;
    totalSqErr += err * err;
  }
  const mse = totalSqErr / dataPoints.length;

  // Compute curvature (sum of magnitude of second derivative approximation)
  // Resample the path at uniform x intervals first
  const SAMPLES = 50;
  const sampledY: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const sx = i / SAMPLES;
    // Interpolate on sorted path
    let y = sorted[0].y;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].x <= sx && sorted[j + 1].x >= sx) {
        const t = (sx - sorted[j].x) / (sorted[j + 1].x - sorted[j].x + 1e-9);
        y = sorted[j].y + t * (sorted[j + 1].y - sorted[j].y);
        break;
      }
      if (j === sorted.length - 2) {
        y = sorted[sorted.length - 1].y;
      }
    }
    sampledY.push(y);
  }

  let curvatureSum = 0;
  for (let i = 1; i < sampledY.length - 1; i++) {
    const d2 = sampledY[i - 1] - 2 * sampledY[i] + sampledY[i + 1];
    curvatureSum += Math.abs(d2);
  }
  // Normalize curvature by number of samples
  const curvature = curvatureSum / (sampledY.length - 2);

  // Score formula:
  // MSE term: lower is better. Map mse from 0..0.05 to 100..0
  const mseTerm = Math.max(0, 100 - mse * 2000);

  // Curvature term: penalize wiggles. Map curvature 0..0.05 to 0..100
  const curvaturePenalty = Math.min(curvature * 1500, 80);

  // Combined score
  let score = Math.round(mseTerm - curvaturePenalty);
  score = Math.max(0, Math.min(100, score));

  let label: string;
  let labelColor: string;
  if (score >= 70) {
    label = "GOOD FIT!";
    labelColor = GREEN;
  } else if (mseTerm < 40) {
    label = "UNDERFIT";
    labelColor = "#ffab00";
  } else {
    label = "OVERFIT";
    labelColor = RED;
  }

  return { score, mse, curvature, label, labelColor };
}

// --- Streak ---
function getStreakMultiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 7) return 2.5;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

function getMultiplierColor(mult: number): string {
  if (mult >= 2.5) return "#ff4444";
  if (mult >= 2) return PINK;
  if (mult >= 1.5) return "#ffab00";
  return "white";
}

const STORAGE_KEY = "portal-overfit-scores";

// --- Types ---
type GamePhase = "menu" | "drawing" | "scored" | "gameover";

// --- Rounded rect helper ---
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
export default function OverfitGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game state refs (refs to avoid re-renders in the game loop)
  const phaseRef = useRef<GamePhase>("menu");
  const roundRef = useRef(1);
  const totalScoreRef = useRef(0);
  const roundScoreRef = useRef(0);
  const seedRef = useRef(0);

  // Round data
  const trueFnRef = useRef<TrueFunction>(() => 0.5);
  const dataPointsRef = useRef<DataPoint[]>([]);
  const drawnPathRef = useRef<Array<{ x: number; y: number }>>([]);
  const isDrawingRef = useRef(false);

  // Scoring result
  const scoreLabelRef = useRef("");
  const scoreLabelColorRef = useRef("");
  const roundMseRef = useRef(0);
  const roundCurvatureRef = useRef(0);
  const showTrueCurveRef = useRef(false);

  // Streak
  const streakRef = useRef(0);

  // Strikes
  const strikesRef = useRef(0);
  const showStrikeRef = useRef(false);

  // Time bonus
  const roundStartTimeRef = useRef(0);
  const timeBonusRef = useRef(0);

  // Live accuracy
  const liveMseRef = useRef(-1);

  // Effects
  const particlesRef = useRef<Particle[]>(createParticlePool());
  const shakeTimerRef = useRef(0);
  const shakeIntensityRef = useRef(0);
  const flashColorRef = useRef("");
  const flashTimerRef = useRef(0);
  const flashMaxRef = useRef(0);

  // Scored phase timer
  const scoredTimerRef = useRef(0);

  // Animation
  const animFrameRef = useRef(0);
  const frameCountRef = useRef(0);
  const scaleRef = useRef(1);

  // React state for overlay UI
  const [gamePhase, setGamePhase] = useState<GamePhase>("menu");
  const [displayScore, setDisplayScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard(STORAGE_KEY));
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const showNameInputRef = useRef(false);

  // --- Setup a new round ---
  const setupRound = useCallback(() => {
    const round = roundRef.current;
    const seed = seedRef.current + round * 137;
    trueFnRef.current = makeTrueFunction(round, seed);
    dataPointsRef.current = generatePoints(round, trueFnRef.current, seed);
    drawnPathRef.current = [];
    isDrawingRef.current = false;
    showTrueCurveRef.current = false;
    scoreLabelRef.current = "";
    roundScoreRef.current = 0;
    scoredTimerRef.current = 0;
    showStrikeRef.current = false;
    timeBonusRef.current = 0;
    liveMseRef.current = -1;
    roundStartTimeRef.current = Date.now();
    phaseRef.current = "drawing";
    setGamePhase("drawing");
  }, []);

  // --- Start game ---
  const startGame = useCallback(() => {
    roundRef.current = 1;
    totalScoreRef.current = 0;
    streakRef.current = 0;
    strikesRef.current = 0;
    seedRef.current = Date.now();
    setDisplayScore(0);
    setShowNameInput(false);
    showNameInputRef.current = false;
    setPlayerName("");
    for (let i = 0; i < particlesRef.current.length; i++) {
      particlesRef.current[i].active = false;
    }
    shakeTimerRef.current = 0;
    flashTimerRef.current = 0;
    setupRound();
  }, [setupRound]);

  // --- Submit fit ---
  const submitFit = useCallback(() => {
    if (phaseRef.current !== "drawing") return;
    if (drawnPathRef.current.length < 5) return;

    const result = computeScore(drawnPathRef.current, dataPointsRef.current);

    // Time bonus
    const elapsed = (Date.now() - roundStartTimeRef.current) / 1000;
    let timeBonus = 0;
    if (elapsed < 10) timeBonus = 20;
    else if (elapsed < 15) timeBonus = 10;
    timeBonusRef.current = timeBonus;

    roundScoreRef.current = Math.min(100, result.score + timeBonus);
    scoreLabelRef.current = result.label;
    scoreLabelColorRef.current = result.labelColor;
    roundMseRef.current = result.mse;
    roundCurvatureRef.current = result.curvature;
    showTrueCurveRef.current = true;

    const isGoodFit = result.score >= 60;

    // Strike check
    showStrikeRef.current = false;
    if (result.score < 30) {
      strikesRef.current++;
      showStrikeRef.current = true;
    }

    if (isGoodFit) {
      streakRef.current++;
      const mult = getStreakMultiplier(streakRef.current);
      const pts = Math.round((result.score + timeBonus) * mult);
      totalScoreRef.current += pts;
      setDisplayScore(totalScoreRef.current);

      // Celebration particles
      emitParticles(particlesRef.current, 60, CANVAS_W / 2, CANVAS_H / 2, {
        speedMin: 1, speedMax: 5, lifeFrames: 50,
        colors: [GREEN, TEAL, "#ffffff", "#00e5ff"], sizeMin: 2, sizeMax: 5,
      });
      flashColorRef.current = "rgba(0,200,100,0.12)";
      flashTimerRef.current = 20;
      flashMaxRef.current = 20;
    } else {
      streakRef.current = 0;
      totalScoreRef.current += result.score + timeBonus;
      setDisplayScore(totalScoreRef.current);

      // Bad fit shake
      shakeIntensityRef.current = result.score < 30 ? 8 : 4;
      shakeTimerRef.current = 12;

      if (result.score < 30) {
        flashColorRef.current = "rgba(255,50,50,0.15)";
      } else {
        flashColorRef.current = "rgba(255,150,0,0.1)";
      }
      flashTimerRef.current = 18;
      flashMaxRef.current = 18;
    }

    phaseRef.current = "scored";
    setGamePhase("scored");
  }, []);

  // --- Clear drawn path ---
  const clearPath = useCallback(() => {
    if (phaseRef.current !== "drawing") return;
    drawnPathRef.current = [];
  }, []);

  // --- End game ---
  const endGame = useCallback(() => {
    phaseRef.current = "gameover";
    setGamePhase("gameover");

    const finalScore = totalScoreRef.current;
    if (finalScore > 0) {
      setShowNameInput(true);
      showNameInputRef.current = true;
    }
  }, []);

  const handleSaveScore = useCallback(() => {
    const name = playerName.trim() || "Anonymous";
    const finalScore = totalScoreRef.current;
    saveToLeaderboard(STORAGE_KEY, name, finalScore);
    setLeaderboard(loadLeaderboard(STORAGE_KEY));
    setShowNameInput(false);
    showNameInputRef.current = false;
  }, [playerName]);

  // --- Advance from scored phase (tap to continue) ---
  const advanceFromScored = useCallback(() => {
    if (phaseRef.current !== "scored") return;
    if (strikesRef.current >= 3 || roundRef.current >= 10) {
      endGame();
    } else {
      roundRef.current++;
      setupRound();
    }
  }, [endGame, setupRound]);

  // --- Drawing input handlers ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(clientX: number, clientY: number): [number, number] {
      const rect = canvas!.getBoundingClientRect();
      const sx = CANVAS_W / rect.width;
      const sy = CANVAS_H / rect.height;
      return [
        (clientX - rect.left) * sx,
        (clientY - rect.top) * sy,
      ];
    }

    function isInPlot(cx: number, cy: number): boolean {
      return cx >= PLOT_LEFT && cx <= PLOT_RIGHT && cy >= PLOT_TOP && cy <= PLOT_BOTTOM;
    }

    function addPoint(cx: number, cy: number) {
      if (phaseRef.current !== "drawing") return;
      if (!isInPlot(cx, cy)) return;
      const [dx, dy] = canvasToData(cx, cy);
      const path = drawnPathRef.current;
      // Throttle: skip if too close to last point
      if (path.length > 0) {
        const last = path[path.length - 1];
        const dist = Math.sqrt((dx - last.x) ** 2 + (dy - last.y) ** 2);
        if (dist < 0.005) return;
      }
      path.push({ x: dx, y: dy });
    }

    function onMouseDown(e: MouseEvent) {
      if (phaseRef.current === "scored") {
        advanceFromScored();
        return;
      }
      if (phaseRef.current !== "drawing") return;
      e.preventDefault();
      isDrawingRef.current = true;
      const [cx, cy] = getCanvasPos(e.clientX, e.clientY);
      addPoint(cx, cy);
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const [cx, cy] = getCanvasPos(e.clientX, e.clientY);
      addPoint(cx, cy);
    }

    function onMouseUp(e: MouseEvent) {
      e.preventDefault();
      isDrawingRef.current = false;
    }

    function onTouchStart(e: TouchEvent) {
      if (phaseRef.current === "scored") {
        e.preventDefault();
        advanceFromScored();
        return;
      }
      if (phaseRef.current !== "drawing") return;
      e.preventDefault();
      isDrawingRef.current = true;
      const touch = e.touches[0];
      const [cx, cy] = getCanvasPos(touch.clientX, touch.clientY);
      addPoint(cx, cy);
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const [cx, cy] = getCanvasPos(touch.clientX, touch.clientY);
      addPoint(cx, cy);
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      isDrawingRef.current = false;
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // --- Resize ---
  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const maxW = container.clientWidth;
      const maxH = Math.min(520, window.innerHeight * 0.7);
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
      updateParticles(particlesRef.current);
      if (shakeTimerRef.current > 0) shakeTimerRef.current--;
      if (flashTimerRef.current > 0) flashTimerRef.current--;

      if (phase === "scored") {
        scoredTimerRef.current++;
      }

      // Live MSE during drawing
      if (phase === "drawing") {
        const path = drawnPathRef.current;
        if (path.length >= 3) {
          const sorted = [...path].sort((a, b) => a.x - b.x);
          let totalSqErr = 0;
          for (const dp of dataPointsRef.current) {
            let closestY = sorted[0].y;
            let minDist = Infinity;
            for (let i = 0; i < sorted.length - 1; i++) {
              if (sorted[i].x <= dp.x && sorted[i + 1].x >= dp.x) {
                const t = (dp.x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x + 1e-9);
                closestY = sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
                minDist = 0;
                break;
              }
              const d1 = Math.abs(sorted[i].x - dp.x);
              const d2 = Math.abs(sorted[i + 1].x - dp.x);
              if (d1 < minDist) { minDist = d1; closestY = sorted[i].y; }
              if (d2 < minDist) { minDist = d2; closestY = sorted[i + 1].y; }
            }
            const err = dp.y - closestY;
            totalSqErr += err * err;
          }
          liveMseRef.current = totalSqErr / dataPointsRef.current.length;
        } else {
          liveMseRef.current = -1;
        }
      }

      // --- Draw ---
      ctx.save();

      // Screen shake
      if (shakeTimerRef.current > 0) {
        const ratio = shakeTimerRef.current / 12;
        const sx = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        const sy = (Math.random() * 2 - 1) * shakeIntensityRef.current * ratio;
        ctx.translate(sx, sy);
      }

      // Background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // --- Draw plot area ---
      // Grid lines
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = PLOT_LEFT + (i / 10) * PLOT_W;
        ctx.beginPath();
        ctx.moveTo(x, PLOT_TOP);
        ctx.lineTo(x, PLOT_BOTTOM);
        ctx.stroke();

        const y = PLOT_TOP + (i / 10) * PLOT_H;
        ctx.beginPath();
        ctx.moveTo(PLOT_LEFT, y);
        ctx.lineTo(PLOT_RIGHT, y);
        ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = AXIS_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, PLOT_TOP);
      ctx.lineTo(PLOT_LEFT, PLOT_BOTTOM);
      ctx.lineTo(PLOT_RIGHT, PLOT_BOTTOM);
      ctx.stroke();

      // Axis labels
      ctx.font = "10px monospace";
      ctx.fillStyle = LABEL_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let i = 0; i <= 10; i += 2) {
        const x = PLOT_LEFT + (i / 10) * PLOT_W;
        ctx.fillText((i / 10).toFixed(1), x, PLOT_BOTTOM + 6);
      }
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 10; i += 2) {
        const y = PLOT_BOTTOM - (i / 10) * PLOT_H;
        ctx.fillText((i / 10).toFixed(1), PLOT_LEFT - 8, y);
      }

      // Axis titles
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = LABEL_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("x", PLOT_LEFT + PLOT_W / 2, PLOT_BOTTOM + 22);

      ctx.save();
      ctx.translate(18, PLOT_TOP + PLOT_H / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "middle";
      ctx.fillText("y", 0, 0);
      ctx.restore();

      if (phase !== "menu" && phase !== "gameover") {
        // --- Draw data points ---
        const points = dataPointsRef.current;
        for (const p of points) {
          const [cx, cy] = dataToCanvas(p.x, p.y);
          // Glow
          ctx.fillStyle = POINT_GLOW;
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
          // Point
          ctx.fillStyle = POINT_COLOR;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
          // White center
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- Draw player's curve ---
        const path = drawnPathRef.current;
        if (path.length >= 2) {
          ctx.strokeStyle = CURVE_COLOR;
          ctx.lineWidth = 2.5;
          ctx.lineJoin = "round";
          ctx.lineCap = "round";

          // Sort by x for consistent rendering
          const sorted = [...path].sort((a, b) => a.x - b.x);

          ctx.beginPath();
          const [sx, sy] = dataToCanvas(sorted[0].x, sorted[0].y);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < sorted.length; i++) {
            const [px, py] = dataToCanvas(sorted[i].x, sorted[i].y);
            ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Glow effect
          ctx.strokeStyle = "rgba(255, 110, 199, 0.15)";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          for (let i = 1; i < sorted.length; i++) {
            const [px, py] = dataToCanvas(sorted[i].x, sorted[i].y);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // --- Show true curve after scoring ---
        if (showTrueCurveRef.current) {
          const fn = trueFnRef.current;
          ctx.strokeStyle = TRUE_CURVE_COLOR;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          for (let i = 0; i <= 100; i++) {
            const dx = i / 100;
            const dy = fn(dx);
            const [cx2, cy2] = dataToCanvas(dx, Math.max(0, Math.min(1, dy)));
            if (i === 0) ctx.moveTo(cx2, cy2);
            else ctx.lineTo(cx2, cy2);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Glow
          ctx.strokeStyle = TRUE_CURVE_GLOW;
          ctx.lineWidth = 5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          for (let i = 0; i <= 100; i++) {
            const dx = i / 100;
            const dy = fn(dx);
            const [cx2, cy2] = dataToCanvas(dx, Math.max(0, Math.min(1, dy)));
            if (i === 0) ctx.moveTo(cx2, cy2);
            else ctx.lineTo(cx2, cy2);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Legend
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = TRUE_CURVE_COLOR;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

          ctx.strokeStyle = TRUE_CURVE_COLOR;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(PLOT_LEFT + 10, PLOT_TOP + 16);
          ctx.lineTo(PLOT_LEFT + 35, PLOT_TOP + 16);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillText("True function", PLOT_LEFT + 40, PLOT_TOP + 16);

          ctx.strokeStyle = CURVE_COLOR;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(PLOT_LEFT + 10, PLOT_TOP + 32);
          ctx.lineTo(PLOT_LEFT + 35, PLOT_TOP + 32);
          ctx.stroke();
          ctx.fillStyle = CURVE_COLOR;
          ctx.fillText("Your fit", PLOT_LEFT + 40, PLOT_TOP + 32);
        }
      }

      // --- HUD ---
      if (phase === "drawing" || phase === "scored") {
        // Round badge
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        drawRoundRect(ctx, CANVAS_W / 2 - 55, 6, 110, 28, 6);
        ctx.fill();
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = TEAL;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`ROUND ${roundRef.current} / 10`, CANVAS_W / 2, 20);

        // Score badge
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        drawRoundRect(ctx, 8, 6, 80, 28, 6);
        ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = LABEL_COLOR;
        ctx.textAlign = "left";
        ctx.fillText("SCORE", 16, 14);
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = TEAL;
        ctx.fillText(String(totalScoreRef.current), 16, 28);

        // Strike hearts (top right)
        const heartY = 18;
        for (let i = 0; i < 3; i++) {
          const hx = CANVAS_W - 40 + i * 14;
          ctx.font = "14px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (i < 3 - strikesRef.current) {
            ctx.fillStyle = "#ff4466";
          } else {
            ctx.fillStyle = "rgba(255,68,102,0.2)";
          }
          ctx.fillText("❤", hx, heartY);
        }

        // Timer
        if (phase === "drawing") {
          const elapsed = (Date.now() - roundStartTimeRef.current) / 1000;
          const remaining = Math.max(0, 30 - elapsed);
          const timerStr = Math.ceil(remaining).toString();
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          drawRoundRect(ctx, CANVAS_W - 100, 6, 50, 28, 6);
          ctx.fill();
          ctx.font = "bold 14px monospace";
          ctx.fillStyle = remaining <= 10 ? "#ffab00" : remaining <= 5 ? RED : LABEL_COLOR;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(timerStr + "s", CANVAS_W - 75, 20);
        }

        // Streak
        if (streakRef.current >= 3) {
          const mult = getStreakMultiplier(streakRef.current);
          const pulse = 1 + Math.sin(frameCountRef.current * 0.1) * 0.06;
          ctx.save();
          ctx.translate(CANVAS_W / 2, 48);
          ctx.scale(pulse, pulse);
          ctx.font = "bold 12px monospace";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`x${streakRef.current} STREAK ${mult}x`, 0, 0);
          ctx.restore();
        }

        // Live accuracy preview (bottom right of plot, during drawing)
        if (phase === "drawing" && liveMseRef.current >= 0) {
          const accuracy = Math.max(0, Math.min(100, 100 - liveMseRef.current * 2000));
          const accStr = `Accuracy: ${Math.round(accuracy)}%`;
          const accColor = accuracy >= 70 ? GREEN : accuracy >= 40 ? "#ffab00" : RED;
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = accColor;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText(accStr, PLOT_RIGHT - 4, PLOT_BOTTOM - 6);
        }

        // Difficulty indicator
        const round = roundRef.current;
        let diffLabel: string;
        if (round <= 1) diffLabel = "Linear";
        else if (round <= 3) diffLabel = "Quadratic";
        else if (round <= 5) diffLabel = "Cubic";
        else diffLabel = "Sinusoidal";
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(180,220,255,0.35)";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(diffLabel, CANVAS_W - 12, CANVAS_H - 8);
      }

      // --- Scored overlay ---
      if (phase === "scored") {
        const frames = scoredTimerRef.current;
        const fadeIn = Math.min(frames / 10, 1);
        const bounceT = Math.min(frames / 20, 1);
        const scale = 1 + Math.sin(bounceT * Math.PI) * 0.15;

        const panelW = 240;
        const panelH = 180;

        ctx.save();
        ctx.globalAlpha = fadeIn;
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2 + 20);
        ctx.scale(scale, scale);

        // Background pill
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        drawRoundRect(ctx, -panelW / 2, -panelH / 2, panelW, panelH, 12);
        ctx.fill();

        let yOff = -panelH / 2 + 18;

        // Label
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = scoreLabelColorRef.current;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(scoreLabelRef.current, 0, yOff);
        yOff += 22;

        // Accuracy bar
        const mseTerm = Math.max(0, Math.min(100, 100 - roundMseRef.current * 2000));
        const barW = 160;
        const barH = 10;
        const barX = -barW / 2;

        ctx.font = "9px monospace";
        ctx.fillStyle = LABEL_COLOR;
        ctx.textAlign = "left";
        ctx.fillText("Accuracy", barX, yOff);
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(mseTerm)}%`, barX + barW, yOff);
        yOff += 8;

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        drawRoundRect(ctx, barX, yOff, barW, barH, 3);
        ctx.fill();
        const accFill = (mseTerm / 100) * barW;
        ctx.fillStyle = GREEN;
        if (accFill > 0) {
          drawRoundRect(ctx, barX, yOff, accFill, barH, 3);
          ctx.fill();
        }
        yOff += barH + 8;

        // Smoothness bar
        const curvaturePenalty = Math.min(roundCurvatureRef.current * 1500, 80);
        const smoothness = Math.max(0, 100 - curvaturePenalty);

        ctx.font = "9px monospace";
        ctx.fillStyle = LABEL_COLOR;
        ctx.textAlign = "left";
        ctx.fillText("Smoothness", barX, yOff);
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(smoothness)}%`, barX + barW, yOff);
        yOff += 8;

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        drawRoundRect(ctx, barX, yOff, barW, barH, 3);
        ctx.fill();
        const smoothFill = (smoothness / 100) * barW;
        ctx.fillStyle = TEAL;
        if (smoothFill > 0) {
          drawRoundRect(ctx, barX, yOff, smoothFill, barH, 3);
          ctx.fill();
        }
        yOff += barH + 12;

        // Combined score
        ctx.font = "bold 28px monospace";
        ctx.fillStyle = scoreLabelColorRef.current;
        ctx.textAlign = "center";
        ctx.fillText(String(roundScoreRef.current), 0, yOff);

        // Time bonus
        if (timeBonusRef.current > 0) {
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = "#00e5ff";
          ctx.fillText(`+${timeBonusRef.current} TIME BONUS`, 0, yOff + 18);
        }

        // Multiplier text
        if (streakRef.current >= 3 && roundScoreRef.current >= 60) {
          const mult = getStreakMultiplier(streakRef.current);
          ctx.font = "bold 11px monospace";
          ctx.fillStyle = getMultiplierColor(mult);
          ctx.fillText(`${mult}x multiplier!`, 0, yOff + (timeBonusRef.current > 0 ? 32 : 18));
        }

        // Strike text
        if (showStrikeRef.current) {
          const strikePulse = Math.sin(frames * 0.15) * 0.1 + 1;
          ctx.save();
          ctx.scale(strikePulse, strikePulse);
          ctx.font = "bold 18px monospace";
          ctx.fillStyle = RED;
          ctx.fillText("STRIKE!", 0, -panelH / 2 - 14);
          ctx.restore();
        }

        ctx.restore();
        ctx.globalAlpha = 1;

        // TAP TO CONTINUE (outside the scaled group, at bottom)
        const blink = Math.sin(Date.now() * 0.005) > 0;
        if (blink) {
          ctx.font = "bold 13px monospace";
          ctx.fillStyle = TEAL;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("TAP TO CONTINUE", CANVAS_W / 2, CANVAS_H - 18);
        }
      }

      // --- Particles ---
      drawParticles(ctx, particlesRef.current);

      // --- Flash overlay ---
      if (flashTimerRef.current > 0 && flashMaxRef.current > 0) {
        const alpha = flashTimerRef.current / flashMaxRef.current;
        ctx.fillStyle = flashColorRef.current.replace(/[\d.]+\)$/, `${(0.15 * alpha).toFixed(3)})`);
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      // --- Menu overlay ---
      if (phase === "menu") {
        ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Title
        ctx.font = "bold 42px monospace";
        ctx.fillStyle = TEAL;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("OVERFIT!", CANVAS_W / 2, CANVAS_H / 2 - 100);

        // Subtitle
        ctx.font = "16px monospace";
        ctx.fillStyle = "rgba(180,220,255,0.8)";
        ctx.fillText("The bias-variance tradeoff game", CANVAS_W / 2, CANVAS_H / 2 - 60);

        // Instructions
        ctx.font = "13px monospace";
        ctx.fillStyle = "rgba(180,220,255,0.55)";
        const lines = [
          "Draw a curve through the data points.",
          "Too simple = underfit. Too wiggly = overfit.",
          "Find the sweet spot for the best score!",
        ];
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], CANVAS_W / 2, CANVAS_H / 2 - 15 + i * 22);
        }

        // Small chart icon
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2 - 30, CANVAS_H / 2 + 75);
        ctx.lineTo(CANVAS_W / 2 - 30, CANVAS_H / 2 + 105);
        ctx.lineTo(CANVAS_W / 2 + 30, CANVAS_H / 2 + 105);
        ctx.stroke();
        // Data dots
        ctx.fillStyle = POINT_COLOR;
        const dotPositions = [[-20, 95], [-8, 82], [5, 88], [18, 78]];
        for (const [dx, dy] of dotPositions) {
          ctx.beginPath();
          ctx.arc(CANVAS_W / 2 + dx, CANVAS_H / 2 + dy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Curve through them
        ctx.strokeStyle = CURVE_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2 - 25, CANVAS_H / 2 + 96);
        ctx.quadraticCurveTo(CANVAS_W / 2 - 5, CANVAS_H / 2 + 78, CANVAS_W / 2 + 22, CANVAS_H / 2 + 80);
        ctx.stroke();

        // CTA
        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px monospace";
          ctx.fillStyle = TEAL;
          ctx.fillText("CLICK / TAP TO START", CANVAS_W / 2, CANVAS_H / 2 + 140);
        }

        ctx.font = "11px monospace";
        ctx.fillStyle = "rgba(180,220,255,0.35)";
        ctx.fillText("10 rounds. 3 strikes and you're out!", CANVAS_W / 2, CANVAS_H / 2 + 165);
      }

      // --- Game Over overlay ---
      if (phase === "gameover") {
        ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "bold 36px monospace";
        ctx.fillStyle = "#B48EAD";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 70);

        ctx.font = "bold 48px monospace";
        ctx.fillStyle = TEAL;
        ctx.fillText(`${totalScoreRef.current} PTS`, CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.font = "16px monospace";
        ctx.fillStyle = "rgba(180,220,255,0.7)";
        const endReason = strikesRef.current >= 3
          ? `Struck out after ${roundRef.current} rounds`
          : `${roundRef.current} rounds completed`;
        ctx.fillText(endReason, CANVAS_W / 2, CANVAS_H / 2 + 20);

        const blink = Math.sin(Date.now() * 0.004) > 0;
        if (blink) {
          ctx.font = "bold 16px monospace";
          ctx.fillStyle = TEAL;
          ctx.fillText("CLICK / TAP TO PLAY AGAIN", CANVAS_W / 2, CANVAS_H / 2 + 70);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [endGame, setupRound]);

  // --- Menu / gameover click handler ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onClick() {
      const phase = phaseRef.current;
      if (phase === "menu" || (phase === "gameover" && !showNameInputRef.current)) {
        startGame();
      }
    }

    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  }, [startGame, advanceFromScored]);

  // --- Keyboard handler ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const phase = phaseRef.current;
        if (phase === "menu" || (phase === "gameover" && !showNameInputRef.current)) {
          startGame();
        } else if (phase === "scored") {
          advanceFromScored();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startGame, advanceFromScored]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      {/* Game area */}
      <div className="flex-1 flex flex-col items-center gap-3">
        <div ref={containerRef} className="w-full flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl border-2 border-white/10 shadow-2xl shadow-black/50 cursor-crosshair touch-none"
            style={{ imageRendering: "auto" }}
          />
        </div>

        {/* Buttons */}
        {gamePhase === "drawing" && (
          <div className="flex gap-3">
            <button
              onClick={clearPath}
              className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold text-gray-300 transition-colors uppercase tracking-wide"
            >
              Clear
            </button>
            <button
              onClick={submitFit}
              className="px-5 py-2 rounded-lg bg-[#8FBCBB] hover:bg-[#00d4b8] text-sm font-bold text-[#2E3440] transition-colors uppercase tracking-wide"
            >
              Submit Fit
            </button>
          </div>
        )}

        {gamePhase === "scored" && (
          <div className="text-sm text-gray-400 font-mono">
            Tap the canvas or press Space to continue
          </div>
        )}

        {gamePhase === "gameover" && showNameInput && (
          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto mt-3">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveScore()}
              placeholder="Your name"
              maxLength={20}
              className="flex-1 bg-[#3B4252] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
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

        {(gamePhase === "menu" || gamePhase === "gameover") && (
          <div className="text-sm text-gray-500 font-mono">
            Click the canvas or press Space to {gamePhase === "menu" ? "start" : "play again"}
          </div>
        )}

        {/* Score display below canvas */}
        {(gamePhase === "drawing" || gamePhase === "scored") && (
          <div className="text-center font-mono text-sm text-gray-400">
            Total: <span className="text-[#8FBCBB] font-bold">{displayScore} pts</span>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="rounded-xl border border-white/10 bg-[#3B4252]/90 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              🏆
            </span>
            <h3 className="font-[family-name:var(--font-heading)] text-sm font-bold uppercase tracking-wide text-[#8FBCBB]">
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
                        ? "bg-[#8FBCBB] text-white"
                        : i < 3
                          ? "bg-[#8FBCBB]/50 text-white"
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
                  <span className="font-[family-name:var(--font-heading)] text-sm font-bold text-[#8FBCBB]">
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
