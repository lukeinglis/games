# Researcher Agent Output

- **timestamp:** 2026-07-01T20:58:26Z
- **exit_code:** 0

---

# Component Migration Analysis

## 1. PenaltyKick.tsx (WorldCupFantasy)

**Imports:**
- React hooks only (`useState`, `useCallback`, `useEffect`, `useRef`)
- No external parent repo dependencies ✅

**Properties:**
- `use client` directive: ✅
- Rendering: **DOM-based** (divs, animations via CSS keyframes)
- localStorage: `wcf-penalty-highscore` (line 10-25)
- Props: `{ onClose: () => void; onScoreSubmit?: (score: number) => void }`
- No API calls or auth dependencies ✅
- Self-contained game state
- Line count: ~436 lines

**Migration notes:** Fully standalone. Only needs prop interface update and localStorage key namespace change.

---

## 2. GuessTheFlag.tsx (WorldCupFantasy)

**Imports:**
- React hooks only
- `import { teams, type Team } from "@/data/teams"` ⚠️ **Parent dependency**

**Properties:**
- `use client` directive: ✅
- Rendering: **DOM-based**
- localStorage: `wcf-flag-highscore` (line 13-28)
- Props: `{ onClose: () => void; onScoreSubmit?: (score: number) => void }`
- No API calls or auth ✅
- **Data dependency:** Requires 48 World Cup teams with `{ code, name, flag, group }` structure
- Line count: ~336 lines

**Migration notes:** Needs teams data extracted from WorldCupFantasy repo. Can be inlined as a const or moved to a shared data file.

---

## 3. GameLeaderboard.tsx (WorldCupFantasy)

**Imports:**
- React hooks only
- `import type { GameScoreEntry } from "@/app/api/games/scores/route"` ⚠️ **Parent API dependency**

**Properties:**
- `use client` directive: ✅
- Rendering: **DOM-based**
- localStorage: None
- Props: `{ game: "penalty" | "flags"; currentUserId: string | null; refreshKey: number; defaultCollapsed?: boolean }`
- **API calls:** `GET /api/games/scores?game=${game}` (line 30)
- Expected response: `{ kvConfigured?: boolean; scores?: GameScoreEntry[] }`
- Type: `GameScoreEntry = { userId: string; userName: string; score: number }`
- Line count: ~201 lines

**Migration notes:** Needs new API route in games portal. KV storage integration required. The API shape is simple and can be replicated.

---

## 4. BreakawayGame.tsx (FantasyFootball)

**Imports:**
- React hooks only
- No parent repo dependencies ✅

**Properties:**
- `use client` directive: ✅
- Rendering: **Canvas-based** (full game loop with requestAnimationFrame)
- localStorage: None
- Props: None (self-contained)
- **API calls:**
  - `GET /api/game` (leaderboard fetch, line 142)
  - `POST /api/game` with `{ yards: number }` (score submission, line 191)
  - `GET /api/auth/session` (auth check, line 147)
- Expected leaderboard response: `{ leaderboard: LeaderboardEntry[] }` where `LeaderboardEntry = { name: string; yards: number; date: string }`
- Auth integration: Yahoo OAuth session check
- Line count: ~1010 lines

**Migration notes:** Large canvas game. Needs API routes for leaderboard and auth abstraction layer. Auth uses Yahoo OAuth specific to FantasyFootball.

---

## 5. FieldGoalGame.tsx (FantasyFootball)

**Imports:**
- React hooks only
- No parent repo dependencies ✅

**Properties:**
- `use client` directive: ✅
- Rendering: **Canvas-based** (full game loop)
- localStorage: `fg_best_score` (line 150-153)
- Props: None (self-contained)
- **API calls:**
  - `GET /api/game/fieldgoal` (leaderboard, line 155)
  - `POST /api/game/fieldgoal` with `{ score: number }` (score submission, line 222)
  - `GET /api/auth/session` (auth check, line 160)
- Expected response: `{ leaderboard: LeaderboardEntry[] }` where `LeaderboardEntry = { name: string; score: number; date: string }`
- Auth integration: Yahoo OAuth session check
- Line count: ~1313 lines

**Migration notes:** Largest component. Full canvas game with complex rendering. Needs same API/auth abstraction as BreakawayGame.

---

## 6. F1Game.tsx (f1-fantasy)

**Imports:**
- React hooks only
- `import { useSession } from "next-auth/react"` ⚠️ **Auth dependency**

**Properties:**
- `use client` directive: ✅
- Rendering: **Canvas-based** (delta-time game loop)
- localStorage: None
- Props: None (self-contained)
- **API calls:**
  - `GET /api/game` (leaderboard, line 119)
  - `POST /api/game` with `{ score: number, token: string }` (anti-cheat token + score, line 667)
  - `GET /api/game/token` (fetch signed anti-cheat token, line 695)
- Expected leaderboard response: `LeaderboardEntry = { id: string; playerName: string; score: number; updatedAt: string }`
- **Auth integration:** NextAuth session (`session?.user?.id`)
- **Anti-cheat:** Server-signed game token validated on score submission
- Line count: ~942 lines

**Migration notes:** Most sophisticated game. Has anti-cheat system and delta-time physics. Needs NextAuth integration and token API routes.

---

## Summary Table

| Component | Lines | Rendering | Auth? | API Calls | External Deps |
|-----------|-------|-----------|-------|-----------|---------------|
| PenaltyKick | 436 | DOM | No | None | None ✅ |
| GuessTheFlag | 336 | DOM | No | None | Teams data ⚠️ |
| GameLeaderboard | 201 | DOM | Yes (userId) | GET scores | API route ⚠️ |
| BreakawayGame | 1010 | Canvas | Yes (Yahoo) | GET/POST game, session | API routes ⚠️ |
| FieldGoalGame | 1313 | Canvas | Yes (Yahoo) | GET/POST game, session | API routes ⚠️ |
| F1Game | 942 | Canvas | Yes (NextAuth) | GET/POST game, GET token | NextAuth, anti-cheat ⚠️ |

**Total lines to migrate:** ~4,238 lines of game code

**Shared infrastructure needed:**
1. Unified auth abstraction layer (handles NextAuth, Yahoo OAuth, guest play)
2. Leaderboard API routes (`GET /api/games/:game/scores`, `POST /api/games/:game/scores`)
3. Anti-cheat token system (for F1Game)
4. KV storage setup for persistent leaderboards
5. Teams data extraction (for GuessTheFlag)
---

> **⚠ CEO IDENTITY RE-ANCHOR (Sacred Rule 8)**
> You are the Factory CEO. You orchestrate, delegate, and decide. You do NOT implement.
> If you are about to write code, run tests, do research, or fix bugs — STOP and spawn the appropriate agent.
> Re-read your Permitted/Forbidden Actions lists in the Identity section above.
