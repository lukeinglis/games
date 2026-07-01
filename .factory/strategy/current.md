## Strategy — 2026-07-01

### Observations
- **Portal with 5 playable games** — migrated from 3 source repos
- **Composite score:** N/A (no eval configured)
- **Last experiments:** #1 KEEP (scaffold), #2 KEEP (migrate 5 games)
- **Pattern:** Portal has evolved from link aggregator to playable destination with 5 in-browser games

### Completed Hypotheses

#### H1: Scaffold retro games portal (Experiment #1)
- **Verdict:** KEEP
- **PR:** #2 (merged)

#### H2: Migrate 5 mini-games into portal with localStorage leaderboards (Experiment #2)
- **Verdict:** KEEP
- **PR:** #4 (open for human review)
- **QA:** CLEAN after 2 iterations (lint errors fixed)
- **Growth dimension:** capability_surface
- **Features:** PenaltyKick, GuessTheFlag, BreakawayGame, FieldGoalGame, F1Game — all standalone with localStorage leaderboards, 5 route pages, expanded games.ts with 5 categories

### Anti-patterns to Avoid
- Don't use Tailwind v3 config patterns (no tailwind.config.ts)
- Don't add API routes or KV storage for leaderboards (localStorage sufficient for friends league)
- Don't preserve auth flows from source repos (strip completely)
- Don't forget to inline data dependencies when copying between repos

### Backlog
- Add game thumbnail images (screenshot or pixel art) to replace emoji placeholders
- Add homepage high-score display showing recent localStorage scores across all games

### Session State
- **Mode:** Improve (targeted, single-item) — COMPLETE
- **Current phase:** COMPLETE
- **Active experiments:** None
- **Next action:** Human review PR #4, then future cycles can add thumbnails, high-score displays
