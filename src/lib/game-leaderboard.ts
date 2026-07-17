export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}

export function loadLeaderboard(storageKey: string): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
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

export function saveToLeaderboard(storageKey: string, name: string, score: number) {
  const entries = loadLeaderboard(storageKey);
  entries.push({ name, score, date: new Date().toISOString() });
  entries.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 10)));
  } catch { /* storage full */ }

  submitScoreToAPI(storageKey, name, score);
}

function submitScoreToAPI(slug: string, name: string, score: number) {
  fetch(`/api/scores/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, score }),
  }).catch(() => {});
}

export async function fetchLeaderboard(slug: string): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/scores/${encodeURIComponent(slug)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}
