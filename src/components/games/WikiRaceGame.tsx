"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameLeaderboard, { addScore } from "./GameLeaderboard";

// ============================================================
// Wiki Race: Navigate from one Wikipedia article to another
// using only internal links. Scored on time and hops.
// ============================================================

// --- Article Pool (~100 well-known articles) ---
const ARTICLES: string[] = [
  // People
  "Albert Einstein", "Cleopatra", "Elon Musk", "William Shakespeare",
  "Marie Curie", "Leonardo da Vinci", "Nikola Tesla", "Mahatma Gandhi",
  "Napoleon", "Martin Luther King Jr.", "Nelson Mandela", "Isaac Newton",
  "Abraham Lincoln", "Julius Caesar", "Frida Kahlo", "Charles Darwin",
  // Places
  "Tokyo", "Amazon River", "Mount Everest", "Sahara", "Paris",
  "Great Wall of China", "New York City", "Antarctica", "Grand Canyon",
  "Rome", "London", "Machu Picchu", "Sydney", "Cairo",
  // Science
  "DNA", "Black hole", "Quantum mechanics", "Evolution",
  "Photosynthesis", "Theory of relativity", "Speed of light",
  "Periodic table", "Atom", "Gravity", "Solar System",
  // History
  "World War II", "French Revolution", "Roman Empire",
  "Ancient Egypt", "Cold War", "Renaissance", "Industrial Revolution",
  "American Revolution", "Byzantine Empire", "Viking Age",
  // Pop culture
  "Star Wars", "The Beatles", "Super Mario", "Harry Potter",
  "Marvel Cinematic Universe", "The Simpsons", "James Bond",
  "Minecraft", "Pac-Man", "Mickey Mouse", "Pokemon",
  // Technology
  "Internet", "Artificial intelligence", "Bitcoin",
  "Computer", "Smartphone", "Space exploration", "Printing press",
  "World Wide Web", "Programming language", "Robot",
  // Nature
  "Dinosaur", "Great Barrier Reef", "Amazon rainforest",
  "Blue whale", "Coral reef", "Volcano", "Earthquake",
  "Ocean", "Rainforest", "Climate change",
  // Sports
  "FIFA World Cup", "Olympic Games", "Muhammad Ali",
  "Cricket", "Basketball", "Tennis", "Formula One",
  "Tour de France", "Super Bowl", "Baseball",
];

// --- Types ---
type GamePhase = "menu" | "spinning" | "ready" | "racing" | "victory" | "gameover";

interface DOMParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  char: string;
}

let particleIdCounter = 0;

function createParticleBurst(
  x: number,
  y: number,
  count: number,
  colors: string[],
  chars: string[] = ["*", "+", "o", "~"],
): DOMParticle[] {
  const particles: DOMParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      id: ++particleIdCounter,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 40 + Math.random() * 30,
      maxLife: 40 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 12,
      char: chars[Math.floor(Math.random() * chars.length)],
    });
  }
  return particles;
}

// --- Helpers ---
function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwoDifferent(): [string, string] {
  const start = pickRandom(ARTICLES);
  let target = pickRandom(ARTICLES);
  while (target === start) {
    target = pickRandom(ARTICLES);
  }
  return [start, target];
}

function normalizeTitle(title: string): string {
  return decodeURIComponent(title).replace(/_/g, " ").trim().toLowerCase();
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

function calcScore(hops: number, timeMs: number, streak: number): number {
  const base = 1000;
  const hopPenalty = hops * 50;
  const timePenalty = Math.floor(timeMs / 1000);
  const raw = Math.max(0, base - hopPenalty - timePenalty);

  let multiplier = 1;
  if (streak >= 10) multiplier = 2.5;
  else if (streak >= 7) multiplier = 2;
  else if (streak >= 5) multiplier = 1.75;
  else if (streak >= 3) multiplier = 1.5;

  return Math.round(raw * multiplier);
}

// --- Streak persistence ---
const STREAK_KEY = "wiki-race-streak";
function loadStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10) || 0;
}
function saveStreak(s: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, String(s));
}

// --- Wheel Component ---
function buildDisplayItems(items: string[], selected: string | null): string[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const repeated = [...shuffled, ...shuffled, ...shuffled, ...shuffled];
  if (selected) {
    repeated[repeated.length - 3] = selected;
  }
  return repeated;
}

function SpinWheel({
  items,
  selected,
  spinning,
  label,
}: {
  items: string[];
  selected: string | null;
  spinning: boolean;
  label: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const [displayItems] = useState(() => buildDisplayItems(items, selected));
  const prevSpinning = useRef(false);

  // Rebuild display items when spinning starts, using DOM manipulation instead of setState
  useEffect(() => {
    if (spinning && !prevSpinning.current) {
      prevSpinning.current = true;
      const container = scrollRef.current;
      if (!container) return;

      // Generate fresh items directly in the DOM
      const freshItems = buildDisplayItems(items, selected);
      container.innerHTML = "";
      freshItems.forEach((item) => {
        const div = document.createElement("div");
        div.className = "h-10 flex items-center justify-center text-sm text-gray-400 px-2 truncate";
        div.textContent = item;
        container.appendChild(div);
      });

      const totalDistance = (freshItems.length - 3) * 40;
      let traveled = 0;
      let speed = 18;

      const tick = () => {
        traveled += speed;

        const progress = traveled / totalDistance;
        if (progress > 0.6) {
          speed = Math.max(0.5, 18 * (1 - progress) * 2);
        }

        container.scrollTop = traveled;

        if (traveled < totalDistance) {
          animRef.current = requestAnimationFrame(tick);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    }

    if (!spinning) {
      prevSpinning.current = false;
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spinning, items, selected]);

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-2 text-center">
        {label}
      </div>
      <div className="relative h-[120px] overflow-hidden rounded-lg border border-white/10 bg-[#0d1b2a]">
        {/* Selection indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-blue-400/40 bg-blue-400/10 z-10 pointer-events-none" />

        {spinning ? (
          <div
            ref={scrollRef}
            className="h-full overflow-hidden py-10"
            style={{ scrollBehavior: "auto" }}
          >
            {displayItems.map((item, i) => (
              <div
                key={`${item}-${i}`}
                className="h-10 flex items-center justify-center text-sm text-gray-400 px-2 truncate"
              >
                {item}
              </div>
            ))}
          </div>
        ) : selected ? (
          <div className="h-full flex items-center justify-center px-3">
            <span className="text-sm font-bold text-blue-300 text-center leading-tight">
              {selected}
            </span>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-sm text-gray-600">???</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================
// Main Game Component
// ============================================================
export default function WikiRaceGame() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [startArticle, setStartArticle] = useState<string | null>(null);
  const [targetArticle, setTargetArticle] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [, setCurrentTitle] = useState<string>("");
  const [pageHtml, setPageHtml] = useState<string>("");
  const [path, setPath] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(loadStreak);
  const [finalScore, setFinalScore] = useState(0);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [particles, setParticles] = useState<DOMParticle[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyAlreadyPlayed, setDailyAlreadyPlayed] = useState<number | null>(null);
  const [challengeFrom, setChallengeFrom] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Check URL hash for challenge link on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const s = params.get("start");
    const t = params.get("target");
    if (s && t) {
      requestAnimationFrame(() => {
        setStartArticle(decodeURIComponent(s));
        setTargetArticle(decodeURIComponent(t));
        setChallengeFrom(true);
        setPhase("ready");
      });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Particle animation loop
  useEffect(() => {
    if (particles.length === 0) return;

    const tick = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            vx: p.vx * 0.98,
            life: p.life - 1,
          }))
          .filter((p) => p.life > 0);
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [particles.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    if (phase === "racing") {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a Wikipedia article
  const fetchArticle = useCallback(async (title: string): Promise<{ html: string; canonicalTitle: string } | null> => {
    // Rate limiting: wait at least 300ms between fetches
    const now = Date.now();
    const wait = Math.max(0, 300 - (now - lastFetchRef.current));
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    lastFetchRef.current = Date.now();

    try {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json&origin=*&redirects=1&prop=text|displaytitle`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;
      let html = data.parse?.text?.["*"] || "";
      const canonicalTitle = data.parse?.title || title;
      // Replace <a href="/wiki/..."> with <span> to prevent Next.js
      // router from intercepting clicks on anchor tags.
      html = html.replace(
        /<a\s+href="\/wiki\/([^"#]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g,
        (_match: string, articlePath: string, inner: string) =>
          `<span class="wiki-link" data-wiki-title="${articlePath}">${inner}</span>`
      );
      return { html, canonicalTitle };
    } catch {
      return null;
    }
  }, []);

  // Navigate to an article during the race
  const navigateTo = useCallback(async (title: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await fetchArticle(title);
    if (!result) {
      setError(`Could not load "${title}". Click back to try another link.`);
      setLoading(false);
      return;
    }

    setCurrentTitle(result.canonicalTitle);
    setPageHtml(result.html);
    setPath((prev) => [...prev, result.canonicalTitle]);
    setLoading(false);

    // Scroll content to top
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    // Check if we reached the target
    if (targetArticle && normalizeTitle(result.canonicalTitle) === normalizeTitle(targetArticle)) {
      // Victory!
      const finalTime = Date.now() - startTimeRef.current;
      setElapsedMs(finalTime);
      const hopCount = path.length; // path doesn't include this one yet, but we add 1
      const newStreak = streak + 1;
      const score = calcScore(hopCount, finalTime, newStreak);
      setFinalScore(score);
      setStreak(newStreak);
      saveStreak(newStreak);
      setPhase("victory");
      setScoreSaved(false);

      if (isDaily) {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`wiki-race-daily-played-${today}`, String(score));
      }

      // Spawn particles
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 3;
        setParticles(
          createParticleBurst(cx, cy, 40, [
            "#FFD700", "#4fc3f7", "#81C784", "#E040FB", "#FF7043",
          ], ["*", "+", "W", "!", "o"]),
        );
      }
    }
  }, [loading, fetchArticle, targetArticle, path.length, streak]);

  // Handle clicks on wiki-link spans in the Wikipedia content
  const handleWikiClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    let target = e.target as HTMLElement | null;
    while (target && target !== e.currentTarget) {
      const wikiTitle = target.getAttribute("data-wiki-title");
      if (wikiTitle) {
        e.preventDefault();
        e.stopPropagation();
        const articleTitle = decodeURIComponent(wikiTitle.replace(/_/g, " "));
        if (articleTitle.includes(":") && !articleTitle.startsWith("The ")) {
          return;
        }
        navigateTo(articleTitle);
        return;
      }
      target = target.parentElement;
    }
  }, [navigateTo]);

  // --- Actions ---
  const handleSpin = () => {
    const [s, t] = pickTwoDifferent();
    setStartArticle(s);
    setTargetArticle(t);
    setSpinning(true);
    setPhase("spinning");

    // Stop spinning after animation
    setTimeout(() => {
      setSpinning(false);
      setPhase("ready");
    }, 2500);
  };

  const handleDailyChallenge = () => {
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `wiki-race-daily-played-${today}`;

    const previous = localStorage.getItem(dailyKey);
    if (previous) {
      setDailyAlreadyPlayed(parseInt(previous, 10));
      return;
    }

    const hash = hashDate(today);
    const startIdx = hash % ARTICLES.length;
    let targetIdx = (hash * 31 + 7) % ARTICLES.length;
    if (targetIdx === startIdx) {
      targetIdx = (targetIdx + 1) % ARTICLES.length;
    }

    setStartArticle(ARTICLES[startIdx]);
    setTargetArticle(ARTICLES[targetIdx]);
    setIsDaily(true);
    setPhase("ready");
  };

  const handleCopyChallenge = () => {
    if (!startArticle || !targetArticle) return;
    const url = `${window.location.origin}${window.location.pathname}#start=${encodeURIComponent(startArticle)}&target=${encodeURIComponent(targetArticle)}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleStartRace = async () => {
    if (!startArticle) return;
    setPhase("racing");
    setPath([]);
    setElapsedMs(0);
    setError(null);
    setLoading(true);

    const result = await fetchArticle(startArticle);
    if (!result) {
      setError("Failed to load starting article. Please try again.");
      setPhase("ready");
      setLoading(false);
      return;
    }

    setCurrentTitle(result.canonicalTitle);
    setPageHtml(result.html);
    setPath([result.canonicalTitle]);
    setLoading(false);
    startTimeRef.current = Date.now();
  };

  const handleGiveUp = () => {
    setPhase("gameover");
    const newStreak = 0;
    setStreak(newStreak);
    saveStreak(newStreak);
  };

  const handlePlayAgain = () => {
    setPhase("menu");
    setStartArticle(null);
    setTargetArticle(null);
    setPageHtml("");
    setPath([]);
    setElapsedMs(0);
    setError(null);
    setParticles([]);
    setIsDaily(false);
    setDailyAlreadyPlayed(null);
    setChallengeFrom(false);
    setLinkCopied(false);
  };

  const handleSaveScore = () => {
    const name = nameInput.trim() || "Anonymous";
    addScore("wiki-race", name, finalScore);
    setLeaderboardKey((k) => k + 1);
    setScoreSaved(true);
  };

  const hops = Math.max(0, path.length - 1);

  // ============================================================
  // Render
  // ============================================================
  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* DOM Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none z-50 select-none font-bold"
          style={{
            left: p.x,
            top: p.y,
            fontSize: p.size,
            color: p.color,
            opacity: p.life / p.maxLife,
            transform: `rotate(${p.vx * 10}deg)`,
            transition: "none",
          }}
        >
          {p.char}
        </span>
      ))}

      {/* ---- MENU / SPINNING / READY ---- */}
      {(phase === "menu" || phase === "spinning" || phase === "ready") && (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-4xl">📖</div>
            <h2 className="font-heading text-xl font-bold text-white uppercase tracking-wide">
              Wiki Race
            </h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Navigate from one Wikipedia article to another using only internal links.
              Get there in the fewest hops and fastest time!
            </p>
            {streak > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-3 py-1 text-xs">
                <span className="text-amber-400 font-bold">{streak}</span>
                <span className="text-amber-500/70">win streak</span>
              </div>
            )}
          </div>

          {/* Wheels */}
          <div className="flex gap-4 items-stretch">
            <SpinWheel
              items={ARTICLES}
              selected={startArticle}
              spinning={spinning}
              label="Start"
            />
            <div className="flex items-center">
              <span className="text-2xl text-gray-600 select-none">&rarr;</span>
            </div>
            <SpinWheel
              items={ARTICLES}
              selected={targetArticle}
              spinning={spinning}
              label="Target"
            />
          </div>

          {/* Challenge badge */}
          {isDaily && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/40 rounded-full px-3 py-1 text-xs text-purple-300 font-bold">
                Daily Challenge: {new Date().toISOString().slice(0, 10)}
              </span>
            </div>
          )}
          {challengeFrom && !isDaily && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/40 rounded-full px-3 py-1 text-xs text-blue-300 font-bold">
                Challenge from a friend
              </span>
            </div>
          )}
          {dailyAlreadyPlayed !== null && (
            <div className="text-center rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
              <p className="text-sm text-purple-300 font-bold mb-1">Already played today!</p>
              <p className="text-xs text-gray-400">Your score: <span className="text-purple-300 font-bold">{dailyAlreadyPlayed} pts</span></p>
              <button onClick={() => setDailyAlreadyPlayed(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col items-center gap-3">
            {phase === "menu" && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleSpin}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-sm"
                >
                  Spin the Wheels
                </button>
                <button
                  onClick={handleDailyChallenge}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-sm"
                >
                  Daily Challenge
                </button>
              </div>
            )}
            {phase === "spinning" && (
              <div className="text-sm text-gray-500 animate-pulse">
                Spinning...
              </div>
            )}
            {phase === "ready" && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleStartRace}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-sm animate-pulse"
                >
                  Start Race!
                </button>
                <button
                  onClick={handleCopyChallenge}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-xs"
                >
                  {linkCopied ? "Copied!" : "Copy Challenge Link"}
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <GameLeaderboard
            gameSlug="wiki-race"
            refreshKey={leaderboardKey}
            defaultCollapsed={false}
          />
        </div>
      )}

      {/* ---- RACING ---- */}
      {phase === "racing" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
          {/* Race header */}
          <div className="flex-shrink-0 space-y-2 mb-3">
            {/* Top bar: back + target + timer + hops + give up */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={async () => {
                  if (path.length <= 1 || loading) return;
                  const prev = path[path.length - 2];
                  setPath((p) => [...p, prev]);
                  setLoading(true);
                  const result = await fetchArticle(prev);
                  if (result) {
                    setCurrentTitle(result.canonicalTitle);
                    setPageHtml(result.html);
                    if (contentRef.current) contentRef.current.scrollTop = 0;
                  }
                  setLoading(false);
                }}
                disabled={path.length <= 1 || loading}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="Go back (costs a hop)"
              >
                &larr;
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[10px] font-heading uppercase tracking-widest text-gray-500">
                  Target:
                </span>
                <span className="text-sm font-bold text-red-400 truncate animate-pulse">
                  {targetArticle}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-[#0d1b2a] rounded px-2.5 py-1 border border-white/10">
                  <span className="text-[10px] text-gray-500">TIME</span>
                  <span className="font-heading font-bold text-white text-sm tabular-nums">
                    {formatTime(elapsedMs)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#0d1b2a] rounded px-2.5 py-1 border border-white/10">
                  <span className="text-[10px] text-gray-500">HOPS</span>
                  <span className="font-heading font-bold text-blue-300 text-sm tabular-nums">
                    {hops}
                  </span>
                </div>
                <button
                  onClick={handleGiveUp}
                  className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors font-heading uppercase tracking-wide"
                >
                  Give Up
                </button>
              </div>
            </div>

            {/* Breadcrumb trail */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
              {path.map((title, i) => (
                <span key={`${title}-${i}`} className="flex items-center gap-1 flex-shrink-0">
                  {i > 0 && <span className="text-gray-600 text-xs">&rarr;</span>}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      i === path.length - 1
                        ? "bg-blue-500/20 text-blue-300 font-bold"
                        : "text-gray-500"
                    }`}
                  >
                    {title}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-400">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading article...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Wikipedia content */}
          {!loading && pageHtml && (
            <div
              ref={contentRef}
              className="wiki-content flex-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1b2a] p-4 sm:p-6"
              onClick={handleWikiClick}
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
          )}
        </div>
      )}

      {/* ---- VICTORY ---- */}
      {phase === "victory" && (
        <div className="space-y-6 text-center">
          <div>
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="font-heading text-2xl font-bold text-green-400 uppercase tracking-wide">
              You made it!
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {startArticle} &rarr; {targetArticle}
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="bg-[#0d1b2a] border border-white/10 rounded-lg px-4 py-3 min-w-[100px]">
              <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-1">Time</div>
              <div className="font-heading font-bold text-white text-lg">{formatTime(elapsedMs)}</div>
            </div>
            <div className="bg-[#0d1b2a] border border-white/10 rounded-lg px-4 py-3 min-w-[100px]">
              <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-1">Hops</div>
              <div className="font-heading font-bold text-blue-300 text-lg">{hops}</div>
            </div>
            <div className="bg-[#0d1b2a] border border-white/10 rounded-lg px-4 py-3 min-w-[100px]">
              <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-1">Score</div>
              <div className="font-heading font-bold text-gold text-lg">{finalScore}</div>
            </div>
            {streak > 1 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 min-w-[100px]">
                <div className="text-[10px] font-heading uppercase tracking-widest text-amber-500/70 mb-1">Streak</div>
                <div className="font-heading font-bold text-amber-400 text-lg">{streak}x</div>
              </div>
            )}
          </div>

          {/* Path taken */}
          <div className="bg-[#0d1b2a] border border-white/10 rounded-lg p-4 text-left max-w-md mx-auto">
            <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-2">
              Your Path ({path.length} pages)
            </div>
            <ol className="space-y-1">
              {path.map((title, i) => (
                <li key={`${title}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 font-heading text-xs w-5 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span className={
                    i === 0
                      ? "text-blue-300"
                      : i === path.length - 1
                        ? "text-green-400 font-bold"
                        : "text-gray-400"
                  }>
                    {title}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Save score */}
          {!scoreSaved ? (
            <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveScore()}
                placeholder="Your name"
                maxLength={20}
                className="flex-1 bg-[#0d1b2a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSaveScore}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-heading font-bold uppercase tracking-wide rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-green-400">Score saved!</p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-sm"
            >
              Play Again
            </button>
            <button
              onClick={handleCopyChallenge}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-gray-300 font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-xs"
            >
              {linkCopied ? "Copied!" : "Challenge a Friend"}
            </button>
          </div>

          <GameLeaderboard
            gameSlug="wiki-race"
            refreshKey={leaderboardKey}
          />
        </div>
      )}

      {/* ---- GAME OVER (gave up) ---- */}
      {phase === "gameover" && (
        <div className="space-y-6 text-center">
          <div>
            <div className="text-5xl mb-2">😔</div>
            <h2 className="font-heading text-xl font-bold text-gray-400 uppercase tracking-wide">
              Better luck next time
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {startArticle} &rarr; {targetArticle}
            </p>
          </div>

          {/* Path attempted */}
          {path.length > 0 && (
            <div className="bg-[#0d1b2a] border border-white/10 rounded-lg p-4 text-left max-w-md mx-auto">
              <div className="text-[10px] font-heading uppercase tracking-widest text-gray-500 mb-2">
                Your Path ({path.length} pages, {hops} hops)
              </div>
              <ol className="space-y-1">
                {path.map((title, i) => (
                  <li key={`${title}-${i}`} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 font-heading text-xs w-5 text-right flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-gray-400">{title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="text-sm text-gray-500">
            Streak reset to 0
          </div>

          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold uppercase tracking-wide rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>

          <GameLeaderboard
            gameSlug="wiki-race"
            refreshKey={leaderboardKey}
          />
        </div>
      )}

      {/* ---- Wikipedia content styles ---- */}
      <style jsx global>{`
        .wiki-content {
          color: #d1d5db;
          font-size: 0.9375rem;
          line-height: 1.7;
          max-height: 100%;
        }

        .wiki-content h1,
        .wiki-content h2,
        .wiki-content h3,
        .wiki-content h4 {
          color: #e5e7eb;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 0.3em;
        }

        .wiki-content h1 { font-size: 1.5rem; }
        .wiki-content h2 { font-size: 1.25rem; }
        .wiki-content h3 { font-size: 1.1rem; }
        .wiki-content h4 { font-size: 1rem; }

        .wiki-content .wiki-link {
          color: #4fc3f7;
          cursor: pointer;
          border-bottom: 1px solid rgba(79, 195, 247, 0.3);
          transition: all 0.15s;
        }
        .wiki-content .wiki-link:hover {
          color: #81d4fa;
          border-bottom-color: #81d4fa;
        }
        .wiki-content a {
          color: #9ca3af;
          pointer-events: none;
        }

        .wiki-content p {
          margin-bottom: 0.75em;
        }

        .wiki-content ul,
        .wiki-content ol {
          padding-left: 1.5em;
          margin-bottom: 0.75em;
        }

        .wiki-content li {
          margin-bottom: 0.25em;
        }

        .wiki-content b,
        .wiki-content strong {
          color: #f3f4f6;
        }

        /* Hide unnecessary Wikipedia elements */
        .wiki-content .mw-editsection,
        .wiki-content .reference,
        .wiki-content .reflist,
        .wiki-content .refbegin,
        .wiki-content .references,
        .wiki-content .navbox,
        .wiki-content .navbox-styles,
        .wiki-content .sidebar,
        .wiki-content .sistersitebox,
        .wiki-content .noprint,
        .wiki-content .mw-empty-elt,
        .wiki-content .mbox-small,
        .wiki-content .mbox-text,
        .wiki-content .ambox,
        .wiki-content .tmbox,
        .wiki-content .ombox,
        .wiki-content .cmbox,
        .wiki-content .fmbox,
        .wiki-content .dmbox,
        .wiki-content .imbox,
        .wiki-content .metadata,
        .wiki-content .portal,
        .wiki-content .catlinks,
        .wiki-content .authority-control,
        .wiki-content .mw-authority-control,
        .wiki-content .external,
        .wiki-content .plainlinks,
        .wiki-content .hatnote,
        .wiki-content .mw-indicators,
        .wiki-content .mw-cite-backlink,
        .wiki-content .citation,
        .wiki-content sup.reference,
        .wiki-content .noexcerpt,
        .wiki-content .mw-kartographer-container,
        .wiki-content .mw-kartographer-map,
        .wiki-content .locmap,
        .wiki-content .mw-graph,
        .wiki-content .shortdescription,
        .wiki-content .mw-redirect {
          display: none !important;
        }

        /* Hide sections by heading text */
        .wiki-content #See_also,
        .wiki-content #References,
        .wiki-content #External_links,
        .wiki-content #Further_reading,
        .wiki-content #Notes,
        .wiki-content #Sources,
        .wiki-content #Bibliography,
        .wiki-content #Citations {
          display: none !important;
        }

        /* Hide headings and content after References/External links */
        .wiki-content .mw-heading:has(#References),
        .wiki-content .mw-heading:has(#External_links),
        .wiki-content .mw-heading:has(#See_also),
        .wiki-content .mw-heading:has(#Further_reading),
        .wiki-content .mw-heading:has(#Notes),
        .wiki-content .mw-heading:has(#Sources),
        .wiki-content .mw-heading:has(#Bibliography),
        .wiki-content .mw-heading:has(#Citations) {
          display: none !important;
        }

        /* Style infoboxes */
        .wiki-content .infobox,
        .wiki-content .wikitable,
        .wiki-content .sidebar-content {
          display: none !important;
        }

        .wiki-content table {
          border-collapse: collapse;
          margin: 0.75em 0;
          font-size: 0.85rem;
          width: 100%;
        }

        .wiki-content table th,
        .wiki-content table td {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.4em 0.6em;
          background: rgba(13, 27, 42, 0.5);
        }

        .wiki-content table th {
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
          font-weight: 600;
        }

        /* Hide images to keep things fast */
        .wiki-content img,
        .wiki-content figure,
        .wiki-content .thumb,
        .wiki-content .image,
        .wiki-content .mw-file-element,
        .wiki-content .mw-default-size,
        .wiki-content .mw-halign-right,
        .wiki-content .mw-halign-left,
        .wiki-content .mw-file-description {
          display: none !important;
        }

        /* Style the scrollbar */
        .wiki-content::-webkit-scrollbar {
          width: 6px;
        }
        .wiki-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .wiki-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .wiki-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* Breadcrumb scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
