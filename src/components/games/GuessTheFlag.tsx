"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getStreakMultiplier } from "@/lib/game-utils";
import GameLeaderboard, { addScore } from "./GameLeaderboard";

interface Team {
  code: string;
  name: string;
  flag: string;
  group: string;
  difficulty: number;
}

const teams: Team[] = [
  { name: "Czechia", code: "CZE", flag: "🇨🇿", group: "A", difficulty: 2 },
  { name: "Mexico", code: "MEX", flag: "🇲🇽", group: "A", difficulty: 0 },
  { name: "South Africa", code: "RSA", flag: "🇿🇦", group: "A", difficulty: 1 },
  { name: "South Korea", code: "KOR", flag: "🇰🇷", group: "A", difficulty: 1 },
  { name: "Bosnia-Herzegovina", code: "BIH", flag: "🇧🇦", group: "B", difficulty: 2 },
  { name: "Canada", code: "CAN", flag: "🇨🇦", group: "B", difficulty: 0 },
  { name: "Qatar", code: "QAT", flag: "🇶🇦", group: "B", difficulty: 2 },
  { name: "Switzerland", code: "SUI", flag: "🇨🇭", group: "B", difficulty: 1 },
  { name: "Brazil", code: "BRA", flag: "🇧🇷", group: "C", difficulty: 0 },
  { name: "Morocco", code: "MAR", flag: "🇲🇦", group: "C", difficulty: 1 },
  { name: "Haiti", code: "HAI", flag: "🇭🇹", group: "C", difficulty: 2 },
  { name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C", difficulty: 1 },
  { name: "Turkey", code: "TUR", flag: "🇹🇷", group: "D", difficulty: 1 },
  { name: "United States", code: "USA", flag: "🇺🇸", group: "D", difficulty: 0 },
  { name: "Paraguay", code: "PAR", flag: "🇵🇾", group: "D", difficulty: 2 },
  { name: "Australia", code: "AUS", flag: "🇦🇺", group: "D", difficulty: 0 },
  { name: "Germany", code: "GER", flag: "🇩🇪", group: "E", difficulty: 0 },
  { name: "Curacao", code: "CUR", flag: "🇨🇼", group: "E", difficulty: 2 },
  { name: "Ivory Coast", code: "CIV", flag: "🇨🇮", group: "E", difficulty: 2 },
  { name: "Ecuador", code: "ECU", flag: "🇪🇨", group: "E", difficulty: 2 },
  { name: "Sweden", code: "SWE", flag: "🇸🇪", group: "F", difficulty: 1 },
  { name: "Netherlands", code: "NED", flag: "🇳🇱", group: "F", difficulty: 1 },
  { name: "Japan", code: "JPN", flag: "🇯🇵", group: "F", difficulty: 0 },
  { name: "Tunisia", code: "TUN", flag: "🇹🇳", group: "F", difficulty: 2 },
  { name: "Belgium", code: "BEL", flag: "🇧🇪", group: "G", difficulty: 1 },
  { name: "Egypt", code: "EGY", flag: "🇪🇬", group: "G", difficulty: 1 },
  { name: "Iran", code: "IRN", flag: "🇮🇷", group: "G", difficulty: 2 },
  { name: "New Zealand", code: "NZL", flag: "🇳🇿", group: "G", difficulty: 1 },
  { name: "Spain", code: "ESP", flag: "🇪🇸", group: "H", difficulty: 0 },
  { name: "Cape Verde", code: "CPV", flag: "🇨🇻", group: "H", difficulty: 2 },
  { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", group: "H", difficulty: 1 },
  { name: "Uruguay", code: "URY", flag: "🇺🇾", group: "H", difficulty: 1 },
  { name: "Iraq", code: "IRQ", flag: "🇮🇶", group: "I", difficulty: 2 },
  { name: "France", code: "FRA", flag: "🇫🇷", group: "I", difficulty: 0 },
  { name: "Senegal", code: "SEN", flag: "🇸🇳", group: "I", difficulty: 2 },
  { name: "Norway", code: "NOR", flag: "🇳🇴", group: "I", difficulty: 1 },
  { name: "Argentina", code: "ARG", flag: "🇦🇷", group: "J", difficulty: 0 },
  { name: "Algeria", code: "ALG", flag: "🇩🇿", group: "J", difficulty: 2 },
  { name: "Austria", code: "AUT", flag: "🇦🇹", group: "J", difficulty: 1 },
  { name: "Jordan", code: "JOR", flag: "🇯🇴", group: "J", difficulty: 2 },
  { name: "Congo DR", code: "COD", flag: "🇨🇩", group: "K", difficulty: 2 },
  { name: "Portugal", code: "POR", flag: "🇵🇹", group: "K", difficulty: 0 },
  { name: "Uzbekistan", code: "UZB", flag: "🇺🇿", group: "K", difficulty: 2 },
  { name: "Colombia", code: "COL", flag: "🇨🇴", group: "K", difficulty: 1 },
  { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L", difficulty: 0 },
  { name: "Croatia", code: "CRO", flag: "🇭🇷", group: "L", difficulty: 1 },
  { name: "Ghana", code: "GHA", flag: "🇬🇭", group: "L", difficulty: 1 },
  { name: "Panama", code: "PAN", flag: "🇵🇦", group: "L", difficulty: 2 },
];

type GameState = "ready" | "playing" | "correct" | "wrong" | "gameover";

interface Round {
  correctTeam: Team;
  options: Team[];
}

interface DOMParticle {
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

const LS_KEY = "portal-flag-highscore";
const MAX_PARTICLES = 60;

function createDOMParticlePool(): DOMParticle[] {
  const pool: DOMParticle[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: "#fff", size: 4, active: false });
  }
  return pool;
}

function getHighScore(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(LS_KEY);
  if (!val) return 0;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function setHighScore(score: number) {
  if (typeof window === "undefined") return;
  const safe = isFinite(score) && !isNaN(score) ? Math.max(0, score) : 0;
  localStorage.setItem(LS_KEY, String(safe));
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  return `${seconds}.${tenths}s`;
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getStreakLabel(streak: number): string {
  if (streak >= 10) return "UNSTOPPABLE";
  if (streak >= 7) return "ON FIRE";
  if (streak >= 5) return "HOT STREAK";
  if (streak >= 3) return "NICE STREAK";
  return "";
}

function getDifficultyForRound(roundIndex: number, streak: number): number {
  if (roundIndex < 3) return 0;
  if (streak >= 10) return 2;
  if (streak >= 5) return Math.random() < 0.7 ? 2 : 1;
  if (streak >= 3) return Math.random() < 0.5 ? 2 : 1;
  return Math.floor(Math.random() * 3);
}

function generateRound(
  roundIndex: number,
  streak: number,
  usedCodes: Set<string>,
): Round | null {
  const targetDiff = getDifficultyForRound(roundIndex, streak);

  const available = teams.filter((t) => !usedCodes.has(t.code));
  if (available.length < 6) return null;

  let candidates = available.filter((t) => t.difficulty === targetDiff);
  if (candidates.length === 0) {
    candidates = available.filter(
      (t) => t.difficulty <= targetDiff + 1 && t.difficulty >= targetDiff - 1,
    );
  }
  if (candidates.length === 0) candidates = available;

  const correctTeam = candidates[Math.floor(Math.random() * candidates.length)];
  const wrongPool = available.filter((t) => t.code !== correctTeam.code);
  const wrongOptions = shuffle(wrongPool).slice(0, 5);
  const options = shuffle([correctTeam, ...wrongOptions]);

  return { correctTeam, options };
}

export default function GuessTheFlag() {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(() => getHighScore());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBroken, setStreakBroken] = useState(false);
  const [flashType, setFlashType] = useState<"" | "correct" | "wrong" | "perfect">("");
  const [shaking, setShaking] = useState(false);
  const [activeParticles, setActiveParticles] = useState<{ idx: number; x: number; y: number; size: number; color: string; alpha: number }[]>([]);
  const [thinkingPulse, setThinkingPulse] = useState(false);
  const [comboPopText, setComboPopText] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const particlePoolRef = useRef<DOMParticle[]>(createDOMParticlePool());
  const particleFrameRef = useRef(0);
  const particlesActiveRef = useRef(false);
  const usedCodesRef = useRef<Set<string>>(new Set());
  const streakRef = useRef(0);
  const roundStartRef = useRef(0);
  const thinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
      if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startParticleLoop = useCallback(() => {
    if (particlesActiveRef.current) return;
    particlesActiveRef.current = true;

    function tick() {
      const pool = particlePoolRef.current;
      let anyActive = false;
      const snapshot: { idx: number; x: number; y: number; size: number; color: string; alpha: number }[] = [];
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.vx *= 0.97;
        p.life--;
        if (p.life <= 0) {
          p.active = false;
        } else {
          anyActive = true;
          snapshot.push({ idx: i, x: p.x, y: p.y, size: p.size, color: p.color, alpha: p.life / p.maxLife });
        }
      }
      setActiveParticles(snapshot);
      if (anyActive) {
        particleFrameRef.current = requestAnimationFrame(tick);
      } else {
        particlesActiveRef.current = false;
      }
    }

    particleFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const emitParticles = useCallback(
    (
      originX: number,
      originY: number,
      count: number,
      colors: string[],
      opts?: { speedMin?: number; speedMax?: number; sizeMin?: number; sizeMax?: number },
    ) => {
      const speedMin = opts?.speedMin ?? 2;
      const speedMax = opts?.speedMax ?? 8;
      const sizeMin = opts?.sizeMin ?? 4;
      const sizeMax = opts?.sizeMax ?? 10;
      const pool = particlePoolRef.current;

      let emitted = 0;
      for (let i = 0; i < pool.length && emitted < count; i++) {
        if (!pool[i].active) {
          const angle = Math.random() * Math.PI * 2;
          const speed = speedMin + Math.random() * (speedMax - speedMin);
          const lifeFrames = 30 + Math.floor(Math.random() * 30);
          pool[i].x = originX;
          pool[i].y = originY;
          pool[i].vx = Math.cos(angle) * speed;
          pool[i].vy = Math.sin(angle) * speed - 3;
          pool[i].life = lifeFrames;
          pool[i].maxLife = lifeFrames;
          pool[i].color = colors[Math.floor(Math.random() * colors.length)];
          pool[i].size = sizeMin + Math.random() * (sizeMax - sizeMin);
          pool[i].active = true;
          emitted++;
        }
      }

      startParticleLoop();
    },
    [startParticleLoop],
  );


  const triggerFlash = useCallback((type: "correct" | "wrong" | "perfect") => {
    setFlashType(type);
    setTimeout(() => setFlashType(""), 400);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  const startThinkTimer = useCallback(() => {
    if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
    setThinkingPulse(false);
    thinkTimerRef.current = setTimeout(() => {
      setThinkingPulse(true);
    }, 5000);
  }, []);

  const stopThinkTimer = useCallback(() => {
    if (thinkTimerRef.current) clearTimeout(thinkTimerRef.current);
    thinkTimerRef.current = null;
    setThinkingPulse(false);
  }, []);

  const submitScore = useCallback(() => {
    const name = playerName.trim() || "Anonymous";
    addScore("guess-the-flag", name, score);
    setShowNameInput(false);
    setLeaderboardKey((k) => k + 1);
  }, [playerName, score]);

  const startGame = useCallback(() => {
    usedCodesRef.current = new Set();
    streakRef.current = 0;

    const initialRounds: Round[] = [];
    for (let i = 0; i < teams.length; i++) {
      const round = generateRound(i, 0, usedCodesRef.current);
      if (!round) break;
      usedCodesRef.current.add(round.correctTeam.code);
      initialRounds.push(round);
    }

    setRounds(initialRounds);
    setCurrentRound(0);
    setScore(0);
    setElapsedMs(0);
    setStreak(0);
    setStreakBroken(false);
    setGameState("playing");
    setSelectedAnswer(null);
    setIsNewHighScore(false);
    for (let i = 0; i < particlePoolRef.current.length; i++) particlePoolRef.current[i].active = false;
    particlesActiveRef.current = false;
    if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    setActiveParticles([]);
    setFlashType("");
    setComboPopText("");
    setShowNameInput(false);
    setPlayerName("");
    startTimeRef.current = Date.now();
    roundStartRef.current = Date.now();
    stopTimer();
    stopThinkTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
    startThinkTimer();
  }, [stopTimer, stopThinkTimer, startThinkTimer]);

  const handleAnswer = useCallback(
    (team: Team, buttonEl?: HTMLButtonElement) => {
      if (gameState !== "playing") return;
      const round = rounds[currentRound];
      if (!round) return;

      setSelectedAnswer(team.code);
      stopThinkTimer();

      let particleOriginX = 200;
      let particleOriginY = 100;
      if (buttonEl && gameAreaRef.current) {
        const btnRect = buttonEl.getBoundingClientRect();
        const areaRect = gameAreaRef.current.getBoundingClientRect();
        particleOriginX = btnRect.left - areaRect.left + btnRect.width / 2;
        particleOriginY = btnRect.top - areaRect.top + btnRect.height / 2;
      }

      if (team.code === round.correctTeam.code) {
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);
        setStreakBroken(false);

        const mult = getStreakMultiplier(newStreak);
        const basePoints = 1;
        const earnedPoints = Math.round(basePoints * mult);
        const newScore = score + earnedPoints;
        setScore(newScore);

        if (mult > 1) {
          setComboPopText(`${mult}x`);
          setTimeout(() => setComboPopText(""), 800);
        }

        const isPerfect = newStreak >= 10 || (Date.now() - roundStartRef.current < 1500);

        if (isPerfect) {
          triggerFlash("perfect");
          emitParticles(particleOriginX, particleOriginY, 40, [
            "#EBCB8B", "#A3BE8C", "#ffffff", "#FFA500",
          ]);
        } else {
          triggerFlash("correct");
          emitParticles(particleOriginX, particleOriginY, 20, [
            "#A3BE8C", "#EBCB8B", "#ffffff",
          ]);
        }

        setGameState("correct");

        timeoutRef.current = setTimeout(() => {
          const nextRound = currentRound + 1;
          if (nextRound >= rounds.length) {
            stopTimer();
            if (newScore > highScore) {
              setHighScoreState(newScore);
              setHighScore(newScore);
              setIsNewHighScore(true);
            }
            if (newScore > 0) setShowNameInput(true);
            setGameState("gameover");
          } else {
            setCurrentRound(nextRound);
            setSelectedAnswer(null);
            setGameState("playing");
            roundStartRef.current = Date.now();
            startThinkTimer();
          }
        }, 600);
      } else {
        triggerFlash("wrong");
        triggerShake();
        emitParticles(particleOriginX, particleOriginY, 12, [
          "#ff4444", "#ff6666", "#cc0000",
        ], { speedMin: 1, speedMax: 5, sizeMin: 3, sizeMax: 6 });

        if (streakRef.current >= 3) {
          setStreakBroken(true);
        }
        streakRef.current = 0;
        setStreak(0);

        setGameState("wrong");
        stopTimer();
        timeoutRef.current = setTimeout(() => {
          if (score > highScore) {
            setHighScoreState(score);
            setHighScore(score);
            setIsNewHighScore(true);
          }
          if (score > 0) setShowNameInput(true);
          setGameState("gameover");
        }, 1200);
      }
    },
    [
      gameState, rounds, currentRound, score, highScore, stopTimer,
      triggerFlash, triggerShake, emitParticles, stopThinkTimer, startThinkTimer,
    ],
  );

  const round = rounds[currentRound];

  const flashClasses: Record<string, string> = {
    correct: "bg-green-500/20",
    wrong: "bg-red-500/20",
    perfect: "bg-yellow-400/25",
  };

  const mult = getStreakMultiplier(streak);
  const streakLabel = getStreakLabel(streak);

  return (
    <div className="relative w-full max-w-lg mx-auto" ref={gameAreaRef}>
      {/* Particle layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
        {activeParticles.map((p) => (
          <div
            key={p.idx}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: `translate(-50%, -50%)`,
            }}
          />
        ))}
      </div>

      {/* Flash overlay */}
      {flashType && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 rounded-xl transition-opacity duration-300 ${flashClasses[flashType] || ""}`}
          style={{ animation: "gtf-fadeOut 0.4s ease-out forwards" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg font-bold text-white uppercase tracking-wide">
            Guess the Flag
          </span>
          {highScore > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs font-bold text-gold">
              Best: {highScore}
            </span>
          )}
        </div>
      </div>

      {/* Ready screen */}
      {gameState === "ready" && (
        <div className="rounded-xl border border-white/10 bg-navy-light/80 p-8 text-center">
          <span className="text-6xl block mb-4">🏳️</span>
          <h3 className="font-heading text-xl font-bold text-white mb-2">
            Name That Flag!
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Identify World Cup 2026 team flags. One wrong answer ends the game.
            Build streaks for combo multipliers!
          </p>
          <button
            onClick={startGame}
            className="font-heading rounded-lg bg-accent-green px-8 py-3 text-sm font-bold uppercase tracking-wide text-navy transition-all hover:bg-green-300"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Playing / Result */}
      {(gameState === "playing" || gameState === "correct" || gameState === "wrong") && round && (
        <>
          {/* Score bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 relative">
                <span
                  className="font-heading text-2xl font-bold text-accent-green tabular-nums transition-transform duration-150"
                  style={{
                    transform: gameState === "correct" ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  {score}
                </span>
                <span className="text-xs text-gray-500">pts</span>

                {/* Combo pop */}
                {comboPopText && (
                  <span
                    className="absolute -top-4 left-6 text-sm font-bold text-gold"
                    style={{ animation: "gtf-comboPopUp 0.8s ease-out forwards" }}
                  >
                    {comboPopText}
                  </span>
                )}
              </div>

              {/* Streak display */}
              {streak >= 3 && (
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                  style={{
                    background:
                      mult >= 3
                        ? "linear-gradient(90deg, rgba(255,68,68,0.3), rgba(255,165,0,0.3))"
                        : mult >= 2
                          ? "rgba(255,68,68,0.2)"
                          : mult >= 1.5
                            ? "rgba(255,165,0,0.2)"
                            : "rgba(255,215,0,0.2)",
                    animation: "gtf-streakPulse 1s ease-in-out infinite",
                  }}
                >
                  <span className="text-xs font-bold" style={{
                    color: mult >= 2 ? "#ff4444" : mult >= 1.5 ? "#FFA500" : "#EBCB8B",
                  }}>
                    {streak}x {streakLabel}
                  </span>
                  <span className="text-[10px] font-bold" style={{
                    color: mult >= 2 ? "#ff6666" : mult >= 1.5 ? "#FFc040" : "#FFe040",
                  }}>
                    {mult}x pts
                  </span>
                </div>
              )}

              {/* Streak broken notice */}
              {streakBroken && (
                <span
                  className="text-xs font-bold text-red-400"
                  style={{ animation: "gtf-fadeOut 1.2s ease-out forwards" }}
                >
                  STREAK BROKEN!
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                {currentRound + 1} / {rounds.length}
              </span>
              <span className="font-mono text-sm text-gray-400 tabular-nums">
                {formatTime(elapsedMs)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-300"
              style={{
                width: `${rounds.length > 0 ? (currentRound / rounds.length) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Flag display */}
          <div
            className="rounded-xl border border-white/10 bg-navy-light/80 p-6 text-center mb-4 transition-all duration-200"
            style={shaking ? { animation: "gtf-triviaShake 0.3s ease-in-out" } : undefined}
          >
            <div
              className="text-8xl sm:text-9xl leading-none select-none transition-all duration-300"
              style={{
                filter: gameState === "wrong" ? "grayscale(1)" : "none",
                ...(thinkingPulse ? { animation: "gtf-thinkPulse 2s ease-in-out infinite" } : {}),
              }}
            >
              {round.correctTeam.flag}
            </div>
            {gameState === "wrong" && (
              <p className="mt-3 text-sm text-red-400 font-bold">
                It was {round.correctTeam.name}!
              </p>
            )}
            {thinkingPulse && gameState === "playing" && (
              <p
                className="mt-2 text-xs text-gold/60 font-medium"
                style={{ animation: "gtf-fadeIn 0.5s ease-in" }}
              >
                Take your best guess!
              </p>
            )}
          </div>

          {/* Answer options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {round.options.map((option) => {
              let btnClass = "border-white/10 hover:border-accent-green/50 hover:bg-accent-green/5";
              const isSelected = selectedAnswer === option.code;
              const isCorrectAnswer = option.code === round.correctTeam.code;

              if (gameState === "correct" || gameState === "wrong") {
                if (isCorrectAnswer) {
                  btnClass = "border-accent-green bg-accent-green/20 ring-2 ring-accent-green/50";
                } else if (isSelected && !isCorrectAnswer) {
                  btnClass = "border-red-500 bg-red-500/20 ring-2 ring-red-500/50";
                } else {
                  btnClass = "border-white/5 opacity-50";
                }
              }

              return (
                <button
                  key={option.code}
                  onClick={(e) => handleAnswer(option, e.currentTarget)}
                  disabled={gameState !== "playing"}
                  className={`rounded-lg border px-4 py-3 text-left transition-all duration-150 ${btnClass} ${
                    gameState === "playing" ? "cursor-pointer active:scale-95" : "cursor-default"
                  }`}
                >
                  <span className="text-sm font-medium text-white block truncate">
                    {option.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    Group {option.group}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Game Over */}
      {gameState === "gameover" && (
        <div className="rounded-xl border border-white/10 bg-navy-light/80 p-8 text-center">
          <span className="text-5xl block mb-3">
            {score >= 48 ? "👑" : score >= 30 ? "🌟" : score >= 15 ? "⚽" : "😅"}
          </span>
          <p className="font-heading text-3xl font-bold text-white mb-1">{score} <span className="text-lg text-gray-400 font-normal">in {formatTime(elapsedMs)}</span></p>
          <p className="text-sm text-gray-400 mb-1">
            {score >= 48
              ? "PERFECT! You identified every single flag!"
              : score >= 30
                ? "Outstanding! You really know your World Cup teams!"
                : score >= 15
                  ? "Great run! You know your flags well."
                  : score >= 5
                    ? "Not bad! Keep practicing."
                    : "Better luck next time!"}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {currentRound + 1} flags answered ({currentRound} correct)
          </p>
          {isNewHighScore && score > 0 && (
            <p className="text-gold text-sm font-bold mb-3 animate-pulse">
              New High Score!
            </p>
          )}

          {showNameInput && (
            <div className="mb-4 flex items-center gap-2 justify-center">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitScore()}
                placeholder="Your name"
                maxLength={20}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-green w-36"
                autoFocus
              />
              <button
                onClick={submitScore}
                className="rounded-lg bg-accent-green/20 border border-accent-green/40 px-3 py-2 text-sm font-bold text-accent-green hover:bg-accent-green/30 transition-colors"
              >
                Save
              </button>
            </div>
          )}

          <button
            onClick={startGame}
            className="font-heading rounded-lg bg-accent-green px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-navy transition-all hover:bg-green-300"
          >
            Play Again
          </button>

          <div className="mt-4">
            <GameLeaderboard gameSlug="guess-the-flag" refreshKey={leaderboardKey} />
          </div>
        </div>
      )}

      {/* Inline keyframe styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gtf-fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes gtf-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gtf-comboPopUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(1.3); }
        }
        @keyframes gtf-streakPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes gtf-triviaShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes gtf-thinkPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.97); }
        }
      ` }} />
    </div>
  );
}
