---
tags: [factory, experiment, games]
project: games
experiment_id: 2
verdict: keep
score_delta: 0.25
date: 2026-07-01
source: factory-archivist
---

# Experiment #2: Migrate 5 Mini-Games into Portal

## Result
**KEEP** — portal functionality expanded from scaffold-only to 5 working games with localStorage leaderboards. 5 games successfully migrated from 3 source repos; no regressions in build or lint.

## What Changed
Migrated game components from F1, World Cup, and Football fantasy repos:
- PenaltyKick (DOM-based, F1)
- GuessTheFlag (DOM-based, World Cup)
- BreakawayGame (Canvas-based, Football)
- FieldGoalGame (Canvas-based, Football)
- F1Game (Canvas-based, F1)

Rewrote GameLeaderboard to use localStorage instead of API/auth. Created GamePageWrapper for consistent route layout. Games data module lists 8 total games across 5 categories. All 5 routes added with proper TypeScript typing. Build and lint pass on first attempt; 2 QA review iterations for mobile responsiveness and card layout refinement.

## What We Learned
Canvas games migrate cleanly by stripping auth/API calls and preserving game loop logic intact. localStorage is sufficient for small-audience portals (no sync needed across devices). Inlining data dependencies (e.g., teams array) is simpler and cleaner than creating shared data modules when only one consumer exists. GameCard component handles mixed internal/external links well without extra conditional logic.

## Links
- PR: #4
- Branch: exp/002-migrate-games
- Deferred: game thumbnail images, homepage high-score aggregation display
