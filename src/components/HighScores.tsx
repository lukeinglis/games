"use client";

import { useState, useSyncExternalStore } from "react";
import { games } from "@/data/games";

interface AggregatedScore {
  game: string;
  gameEmoji: string;
  gameColor: string;
  name: string;
  score: number;
  date: string;
}

const LOCAL_GAMES = games.filter((g) => !g.external);

function loadAllScores(): AggregatedScore[] {
  if (typeof window === "undefined") return [];

  const all: AggregatedScore[] = [];

  for (const game of LOCAL_GAMES) {
    try {
      const raw = localStorage.getItem(`portal-leaderboard-${game.slug}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      for (const entry of parsed) {
        if (
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.name === "string" &&
          typeof entry.score === "number" &&
          isFinite(entry.score)
        ) {
          all.push({
            game: game.title,
            gameEmoji: game.emoji,
            gameColor: game.color,
            name: entry.name,
            score: entry.score,
            date: entry.date || "",
          });
        }
      }
    } catch {
      continue;
    }
  }

  return all.sort((a, b) => b.score - a.score).slice(0, 10);
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function HighScores() {
  const [scores] = useState<AggregatedScore[]>(() => loadAllScores());
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return null;
  if (scores.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#0d1b2a]/90 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg" aria-hidden>
            🏆
          </span>
          <h2 className="font-heading text-[10px] text-gold uppercase tracking-widest">
            High Scores
          </h2>
        </div>
        <p className="text-center text-sm text-gray-500 py-6">
          No scores yet. Play a game and set some records!
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gold/20 bg-[#0d1b2a]/90 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <span className="text-lg" aria-hidden>
          🏆
        </span>
        <h2 className="font-heading text-[10px] text-gold uppercase tracking-widest">
          High Scores
        </h2>
      </div>

      <div className="px-5 pb-4">
        <div className="h-px bg-gold/10 mb-3" />

        <ul className="space-y-1.5">
          {scores.map((entry, idx) => (
            <li
              key={`${entry.game}-${entry.name}-${entry.score}-${idx}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-base shrink-0" aria-hidden>
                {entry.gameEmoji}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-gray-300 truncate block">
                  {entry.name}
                </span>
                <span className="text-[10px] text-gray-600 font-heading">
                  {entry.game}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="font-heading font-bold text-white tabular-nums block">
                  {entry.score.toLocaleString()}
                </span>
                {entry.date && (
                  <span className="text-[9px] text-gray-600">
                    {formatDate(entry.date)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
