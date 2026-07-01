# Researcher Agent Output

- **timestamp:** 2026-07-01T20:58:41Z
- **exit_code:** 0

---

## Analysis Report: Games Portal Structure

### 1. Data Model (`src/data/games.ts`)

**Game Interface:**
```typescript
interface Game {
  slug: string;           // URL-friendly identifier
  title: string;          // Display name
  description: string;    // Short description for card
  category: GameCategory; // "Prediction" | "Fantasy"
  thumbnailColor: string; // Hex color for emoji background
  emoji: string;          // Single emoji for thumbnail
  url: string;            // External URL to game site
  featured: boolean;      // Featured games show in hero section
}
```

**Current Games:**
- World Cup 2026 Fantasy (Prediction, pitch green #1B5E20, featured)
- F1 Fantasy (Fantasy, red #FF1744, featured)
- Football Fantasy (Fantasy, blue #2979FF, not featured)

**Categories:** `"Prediction" | "Fantasy"` (extracted dynamically from games array)

---

### 2. Routing Structure (`src/app/`)

**Files:**
- `src/app/layout.tsx` - Root layout with header/footer
- `src/app/page.tsx` - Homepage (client component with filtering)
- `src/app/globals.css` - Global styles and Tailwind theme
- `src/app/favicon.ico`

**Pattern:** Single-page portal (no game detail routes). All games link externally via `game.url`.

---

### 3. Components (`src/components/`)

**GameCard.tsx:**
- Supports `size="normal" | "large"` prop
- Colored emoji thumbnail (uses `game.thumbnailColor` as background)
- Category badge (top-right, color-coded: Prediction=accent-green, Fantasy=gold)
- Hover effects: gold border, glow, and scale
- External link with "Play Now" CTA

**FeaturedGames.tsx:**
- Filters `games.filter(g => g.featured)`
- Gradient card container with scanline overlay
- Grid layout (1 column mobile, 2 columns desktop)
- Uses `GameCard` with `size="large"`

**CategoryNav.tsx:**
- Client component with local state
- Pill-style filter buttons: "All Games", "Prediction", "Fantasy"
- Active state: gold background, inactive: navy-light with gold hover

---

### 4. Styling Approach

**Fonts:**
- Heading: `Press Start 2P` (pixel retro font) via `--font-press-start`
- Body: `Source Sans 3` via `--font-source-sans`

**Color Palette (Tailwind v4 theme):**
```css
--color-navy: #0A1628          (background)
--color-navy-light: #132240    (cards)
--color-navy-lighter: #1C3360  (borders)
--color-gold: #FFD700          (accent, CTAs)
--color-gold-dark: #B8960F
--color-accent-green: #00E676  (Prediction category)
--color-pitch-green: #1B5E20
--color-action-red: #FF1744
--color-puzzle-purple: #AA00FF
--color-sports-blue: #2979FF
--color-hot-pink: #FF4081
```

**Special Effects:**
- `.scanline-overlay` - CRT scanline effect
- `.glow-gold` / `.glow-green` - Box shadow glows
- Hover animations: scale, border change, text color transitions

**Layout:**
- Max width: `max-w-6xl` centered with `mx-auto`
- Padding: `px-4 py-8`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` for game cards

---

### 5. Dependencies

**Core:**
- Next.js 16.2.10 (App Router)
- React 19.2.4
- TypeScript 5
- Tailwind CSS v4 with `@tailwindcss/postcss`

**No additional libraries:** Pure React + Next.js + Tailwind

---

### 6. How to Add a New Game

**Pattern to follow:**

1. **Add entry to `src/data/games.ts`:**
```typescript
{
  slug: "new-game",
  title: "New Game Title",
  description: "Short description here.",
  category: "Prediction" | "Fantasy",
  thumbnailColor: "#HEX",  // Pick from palette or custom
  emoji: "🎮",
  url: "https://example.com",
  featured: false,  // true for hero section
}
```

2. **No route needed** - Games link externally, no local pages

3. **Styling automatically applied** - GameCard and CategoryNav work off the games array

4. **Category badge color** - Defined in `GameCard.tsx:3-6`:
   - `Prediction` → accent-green
   - `Fantasy` → gold
   - Add new category colors here if needed

---

### Key Patterns

- **Single source of truth:** `src/data/games.ts` drives entire portal
- **External linking only:** No local game pages, all `game.url` are external
- **Retro aesthetic:** Press Start 2P font, scanlines, glow effects, bold colors
- **Mobile-first responsive:** Grid collapses 3→2→1 columns
- **Client-side filtering:** No server components for game list (filtering is interactive)
- **Tailwind v4 @theme syntax:** Custom properties in globals.css, no separate config file
---

> **⚠ CEO IDENTITY RE-ANCHOR (Sacred Rule 8)**
> You are the Factory CEO. You orchestrate, delegate, and decide. You do NOT implement.
> If you are about to write code, run tests, do research, or fix bugs — STOP and spawn the appropriate agent.
> Re-read your Permitted/Forbidden Actions lists in the Identity section above.
