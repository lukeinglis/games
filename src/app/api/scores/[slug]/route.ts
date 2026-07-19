import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const MAX_ENTRIES = 20;
const VALID_SLUGS = new Set([
  "breakaway", "f1-racer", "penalty-kick", "field-goal", "guess-the-flag",
  "overfit", "token-blitz", "hallucination-hunter", "wiki-race",
]);

function redisKey(slug: string) {
  return `leaderboard:${slug}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!VALID_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  try {
    const entries = await redis.zrange(redisKey(slug), 0, MAX_ENTRIES - 1, {
      rev: true,
      withScores: true,
    });

    const leaderboard: { name: string; score: number; date: string }[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      try {
        const data = typeof entries[i] === "string"
          ? JSON.parse(entries[i] as string)
          : entries[i];
        leaderboard.push({
          name: data.name || "Anonymous",
          score: entries[i + 1] as number,
          date: data.date || "",
        });
      } catch {
        continue;
      }
    }

    return NextResponse.json(leaderboard, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!VALID_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "Anonymous").slice(0, 30);
    const score = Number(body.score);

    if (!isFinite(score) || score < 0) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const key = redisKey(slug);
    const date = new Date().toISOString();
    const member = JSON.stringify({ name, date, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });

    await redis.zadd(key, { score, member });

    const count = await redis.zcard(key);
    if (count > MAX_ENTRIES) {
      await redis.zremrangebyrank(key, 0, count - MAX_ENTRIES - 1);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
