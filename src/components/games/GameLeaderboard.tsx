"use client";

import { useState, useEffect } from "react";
import { fetchLeaderboard } from "@/lib/game-leaderboard";

interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

interface GameLeaderboardProps {
  gameSlug: string;
  refreshKey?: number;
  defaultCollapsed?: boolean;
}

function getStorageKey(gameSlug: string): string {
  return `portal-leaderboard-${gameSlug}`;
}

function loadEntries(gameSlug: string): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(gameSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e: unknown): e is LeaderboardEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as LeaderboardEntry).name === "string" &&
          typeof (e as LeaderboardEntry).score === "number" &&
          isFinite((e as LeaderboardEntry).score),
      )
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function saveEntries(gameSlug: string, entries: LeaderboardEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getStorageKey(gameSlug),
      JSON.stringify(entries.slice(0, 10)),
    );
  } catch {
    /* storage full or unavailable */
  }
}

export function addScore(gameSlug: string, name: string, score: number) {
  const entries = loadEntries(gameSlug);
  entries.push({ name, score, date: new Date().toISOString() });
  entries.sort((a, b) => b.score - a.score);
  saveEntries(gameSlug, entries.slice(0, 10));

  fetch(`/api/scores/${encodeURIComponent(gameSlug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score }),
  }).catch(() => {});
}

function mergeEntries(local: LeaderboardEntry[], remote: LeaderboardEntry[]): LeaderboardEntry[] {
  const seen = new Set<string>();
  const merged: LeaderboardEntry[] = [];
  for (const entry of [...local, ...remote]) {
    const key = `${entry.name}|${entry.score}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged.sort((a, b) => b.score - a.score).slice(0, 20);
}

export default function GameLeaderboard({
  gameSlug,
  refreshKey = 0,
  defaultCollapsed = false,
}: GameLeaderboardProps) {
  const [prevRefreshKey, setPrevRefreshKey] = useState(refreshKey);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => loadEntries(gameSlug));
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    fetchLeaderboard(gameSlug).then((remote) => {
      if (remote.length > 0) {
        setEntries((prev) => mergeEntries(prev, remote));
      }
    });
  }, [gameSlug, refreshKey]);

  if (prevRefreshKey !== refreshKey) {
    setPrevRefreshKey(refreshKey);
    setEntries(loadEntries(gameSlug));
  }

  const rankColor = (rank: number): string => {
    if (rank === 1) return "text-gold";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-gray-500";
  };

  const rankBg = (rank: number): string => {
    if (rank === 1) return "bg-gold/10";
    if (rank === 2) return "bg-gray-300/5";
    if (rank === 3) return "bg-amber-600/5";
    return "";
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#3B4252]/90 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 sm:cursor-default"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🏆
          </span>
          <span className="font-heading text-sm font-bold text-white uppercase tracking-wide">
            Leaderboard
          </span>
        </div>
        <span className="text-gray-500 text-xs sm:hidden">
          {collapsed ? "▼" : "▲"}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="h-px bg-white/10 mb-3" />

          {entries.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              No scores yet. Be the first!
            </p>
          )}

          {entries.length > 0 && (
            <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {entries.map((entry, idx) => {
                const rank = idx + 1;
                return (
                  <li
                    key={`${entry.name}-${entry.score}-${idx}`}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${rankBg(rank)}`}
                  >
                    <span
                      className={`w-6 text-right font-heading font-bold text-xs ${rankColor(rank)}`}
                    >
                      {rank}.
                    </span>
                    <span className="flex-1 truncate text-gray-300">
                      {entry.name}
                    </span>
                    <span
                      className={`font-heading font-bold tabular-nums ${rank === 1 ? "text-gold" : "text-white"}`}
                    >
                      {entry.score}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
