# Research Report — Games Portal Scaffold

## Project Summary

This is a **greenfield project** to scaffold a retro games portal at games.lukeinglis.me inspired by AddictingGames and Miniclip circa 2005. The portal aggregates mini-games from the user's sports sites:

- **F1 Fantasy** (f1.lukeinglis.com) — presumably an F1 season prediction/fantasy game
- **World Cup 2026 Fantasy** (worldcup.lukeinglis.com) — two-tier scoring system with group predictions + knockout bracket picker
- **Football Fantasy** (football.lukeinglis.com) — details unknown, likely similar fantasy mechanics

The backlog item requests: Next.js 16 App Router with TypeScript and Tailwind CSS v4, dark background, bold saturated colors, game card grid with thumbnails and ratings, categories, featured section, retro pixel-art accents, playful typography, mobile-first responsive.

## External Research Findings

### 1. Next.js 16 App Router for Static Portals

**Source:** [Next.js 16 App Router Guide (Craftly)](https://getcraftly.dev/blog/nextjs-16-app-router-guide)

**Key patterns for a static games portal:**

- **Static-first rendering** — Pages are faster, cheaper, and cached by default. Only use `dynamic = 'force-dynamic'` when the page genuinely needs fresh data on every request. For a portal site linking to external games, fully static rendering is ideal.

- **generateStaticParams** — Pre-render all game detail pages at build time:
  ```tsx
  export async function generateStaticParams() {
    const games = await fetchAllGames(); // from data file
    return games.map((game) => ({ slug: game.slug }));
  }
  ```

- **SEO via generateMetadata** — Server-generate unique metadata for each game:
  ```tsx
  export async function generateMetadata({ params }) {
    const { slug } = await params;
    const game = await fetchGame(slug);
    return { title: game.title, description: game.description };
  }
  ```
  This produces "near-perfect SEO scores" without client-side workarounds.

- **Suspense for streaming** — Wrap slower components in `<Suspense>` so fast parts render immediately. For a static portal, this is less critical since everything is pre-rendered, but useful if adding any dynamic elements later.

**Actionable:** Use `generateStaticParams` for all game pages, ship fully static HTML, leverage Next.js 16's improved static generation performance.

---

### 2. Tailwind CSS v4 Setup & Configuration

**Sources:**
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind + Next.js Setup Guide (2026)](https://designrevision.com/blog/tailwind-nextjs-setup)

**Major v4 changes:**

- **CSS-first configuration** — Design tokens defined via `@theme` directive in CSS, not JavaScript config:
  ```css
  @import "tailwindcss";
  
  @theme {
    --color-pitch-green: oklch(0.35 0.15 145);
    --color-navy: oklch(0.12 0.02 240);
    --color-gold: oklch(0.85 0.18 85);
    --font-heading: "Press Start 2P", monospace;
    --breakpoint-3xl: 1920px;
  }
  ```

- **Zero-config content detection** — Automatically scans template files, respects `.gitignore`, no `content` array needed. Optional `@source` directive for explicit paths.

- **Installation (Next.js):**
  ```bash
  npm i tailwindcss @tailwindcss/postcss
  ```
  
  PostCSS config:
  ```javascript
  // postcss.config.js
  export default {
    plugins: ["@tailwindcss/postcss"],
  };
  ```
  
  CSS import (single directive):
  ```css
  /* app.css or globals.css */
  @import "tailwindcss";
  ```

- **Performance improvements:**
  - Full builds: **3.78x faster**
  - Incremental builds: **182x faster** (no new CSS)
  - Output CSS: **~70% smaller** (6-12 KB gzipped vs 20-30 KB in v3)

- **Built-in container queries:**
  ```html
  <div class="@container">
    <div class="grid grid-cols-1 @sm:grid-cols-3 @lg:grid-cols-4">
      <!-- Responsive to container size, not viewport -->
    </div>
  </div>
  ```

- **Dynamic utility values** — No arbitrary value syntax needed:
  ```html
  <div class="grid grid-cols-15"></div> <!-- Any column count -->
  <div class="mt-17 w-29"></div> <!-- Any spacing value -->
  ```

**Actionable:** Initialize with `@import "tailwindcss"` in globals.css, define retro color palette in `@theme` block (pitch green, navy, gold, accent colors), use container queries for game card grids.

---

### 3. Retro Game Portal Design Patterns (AddictingGames, Miniclip)

**Sources:**
- [Miniclip Old Games — Nostalgic Trip](https://explore.st-aug.edu/exp/miniclip-old-games-a-nostalgic-trip-down-memory-lane) (unreachable)
- [Flash Games History](https://rip.so/flash-games.html) (403 Forbidden)
- Web Design Museum [Threads Post](https://www.threads.com/@webdesignmuseum/post/DLhrdSSIUWj/websites-with-online-games-in-2005which-ones-do-you-remember-visiting-addicting-)

**Design philosophy (from search results):**

- **Minimalism as creative strategy** — Early 2000s portals were limited by bandwidth, leading to intuitive UX with clear goals, straightforward controls, and immediate reward systems.

- **Pixel art + vibrant colors** — Characters and UI elements used vibrant colors popping against monochrome or dark backgrounds, making content instantly recognizable across devices.

- **Visual cues over text** — Games guided players through visual feedback loops where success felt instant (click → points, run → extend, puzzle → solve).

- **Platform characteristics:**
  - **Miniclip (2001)** — Largest commercial Flash game site, categories and front-page promotion
  - **AddictingGames (2002)** — Viacom-owned, heavy on licensed cartoon brands, ad-heavy front pages

**Key visual elements (inferred from era):**

- **Dark backgrounds** — Black or deep navy to make game thumbnails and colors pop
- **Bold gradients** — Header bars with linear gradients (blue-to-green, orange-to-red)
- **Chunky category navigation** — Big clickable tabs or sidebar with categories (Action, Puzzle, Sports, etc.)
- **Game card grids** — Thumbnail, title, star rating, play count
- **Featured section** — Hero carousel or large featured game at top
- **Pixel fonts for headings** — Arcadey, blocky typography

**Actionable:** Dark navy background (#0A1628), bold saturated accent colors (gold #FFD700, accent green #00E676), game cards in responsive grid, category sidebar or top nav, featured games section, pixel font for headings.

---

### 4. Mobile-First Responsive Grid Layouts for Game Cards

**Sources:**
- [CSS Grid Responsive Design: Mobile-First](https://medium.com/codetodeploy/css-grid-responsive-design-the-mobile-first-approach-that-actually-works-194bdab9bc52)
- [Responsive Card Layout with CSS Grid](https://dev.to/m97chahboun/responsive-card-layout-with-css-grid-a-step-by-step-guide-3ej1)
- [CSS Grid: Responsive Cards without Media Query](https://yonedesign.medium.com/css-grid-responsive-cards-without-media-query-2206722e8936)

**Mobile-first pattern:**

Start with single column, then expand at larger breakpoints:

```css
/* Mobile first (default) */
.game-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 640px) {
  .game-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .game-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

**Auto-fit/auto-fill with minmax (no media queries needed):**

```css
.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}
```

This creates responsive cards where:
- Minimum card width is 300px
- As many cards as can fit appear in each row
- Cards expand to fill available space

**Tailwind v4 equivalent:**

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <!-- Game cards -->
</div>
```

Or with container queries (Tailwind v4 built-in):

```html
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-6">
    <!-- Cards responsive to container, not viewport -->
  </div>
</div>
```

**Actionable:** Use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` for game card layout, or auto-fit pattern for fluid responsiveness. Consider container queries for nested grids (e.g., featured section vs main grid).

---

### 5. Pixel Fonts & Retro Gaming Typography

**Sources:**
- [20 Unique Pixel Fonts to Bring the 80s Back](https://creativemarket.com/blog/unique-pixel-fonts-80s)
- [38 Perfect Pixel Fonts for Video Game Design](https://designworklife.com/pixel-fonts-for-video-game-tech-design/)
- [43 Best Game & Arcade Fonts](https://design.tutsplus.com/articles/42-best-game-arcade-fonts-retro-pixel-video-game-styles--cms-93309)

**Popular pixel fonts for web:**

- **Press Start 2P** — Classic 8-bit arcade font, widely available on Google Fonts, perfect for headings
- **Arcade Classic** — Pixelated feel from 80s arcades, blocky jagged edges
- **Minecraftia** — Sharp, blocky letterforms, clean even at smaller sizes
- **Pixelo** — 8-bit retro inspired, includes uppercase, lowercase, numerals, symbols
- **Bitcraft** — 1980s computer interface aesthetic

**Design applications:**

- Pixel fonts transport viewers back to early computing days
- Perfect for gaming interfaces, menus, branding, retro websites
- Work well for logos, product names, headlines, and playful touches
- Maintain personality that can't be replicated with smooth vector fonts

**Web font strategy:**

Use Google Fonts for easy loading:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

Or define in Tailwind v4 `@theme`:

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

@theme {
  --font-heading: "Press Start 2P", monospace;
  --font-body: system-ui, sans-serif;
}
```

Then use in Tailwind classes: `font-heading`, `font-body`.

**Actionable:** Use Press Start 2P for headings (Google Fonts), define in Tailwind `@theme` as `--font-heading`, apply to game titles and category headers. Keep body text clean (system-ui or Source Sans 3 for consistency with World Cup project).

---

### 6. User's Existing Sports Sites — Mini-Game Inventory

**From CLAUDE.md analysis:**

**World Cup 2026 Fantasy (worldcup.lukeinglis.com):**

- **Tier 1: Group Predictions** — Users predict final standings for all 12 groups (48 teams), bonus picks (Golden Boot, Most Goals Team, Fewest Conceded, etc.), tiebreaker
- **Tier 2: Knockout Bracket** — Interactive bracket picker (March Madness layout on desktop, list view on mobile), predict R32 through Final + 3rd place match
- **Scoring:** Max 306 points (174 Tier 1 + 132 Tier 2), group exact position = 3 pts, right bucket = 1 pt, knockout R32=2, R16=4, QF=6, SF=8, Final=10
- **Auth:** Simple name + email, no passwords, friends league
- **Tech:** Next.js 16 App Router, Vercel KV (Redis), football-data.org API for live results
- **UI:** Pitch green (#1B5E20), navy (#0A1628), gold (#FFD700), Oswald headings, Source Sans 3 body, mobile-first

**Potential game cards for portal:**

1. **World Cup 2026 Fantasy** — Thumbnail: trophy or bracket graphic, Description: "Predict group standings and knockout bracket", Link: worldcup.lukeinglis.com, Category: Sports / Prediction Games

2. **F1 Fantasy** (f1.lukeinglis.com) — Assuming similar mechanics to World Cup, likely season predictions, driver rankings, race outcomes. Thumbnail: F1 car or helmet, Category: Sports / Fantasy

3. **Football Fantasy** (football.lukeinglis.com) — Likely general football/soccer fantasy league. Thumbnail: football/soccer ball, Category: Sports / Fantasy

**Common themes across sites:**

- Sports prediction/fantasy mechanics
- Bracket/ranking pickers
- Scoring systems with detailed point breakdowns
- Friends leagues (name + email auth, no complex registration)
- Mobile-first responsive design
- Vercel deployment

**Actionable:** Portal should feature these three games prominently. Each game card needs:
- **Thumbnail image** (placeholder or custom graphic for each sport)
- **Title** (e.g., "World Cup 2026 Fantasy")
- **Description** (1-2 sentences explaining gameplay)
- **Category tag** (Sports, Prediction, Fantasy)
- **External link** to the actual game site
- **Play count / rating** (can be placeholders for now, or omit until real data available)

---

## Recommended Focus Areas

Ranked by expected impact on successful scaffold:

### 1. **Initialize Next.js 16 + Tailwind v4 project** (CRITICAL)

Use `npx create-next-app@latest` with TypeScript, App Router, Tailwind CSS, and `src/` directory. Post-install: upgrade to Tailwind v4 by installing `tailwindcss @tailwindcss/postcss`, updating PostCSS config, and replacing `globals.css` imports with `@import "tailwindcss"`.

**Why:** Foundation for entire project, must be done first.

**How to apply:** Run `npx create-next-app@latest games --typescript --tailwind --eslint --app --src-dir --yes`, then follow Tailwind v4 migration steps from research above.

---

### 2. **Define retro color palette in Tailwind `@theme`** (HIGH)

Set up custom colors matching retro game portal aesthetic: dark navy background, bold saturated accent colors (gold, accent green), vibrant game category colors (action red, puzzle purple, sports blue).

**Why:** Visual identity is critical for retro aesthetic. Tailwind v4's CSS-first config makes this clean and maintainable.

**How to apply:** In `src/app/globals.css`, add `@theme` block with:
```css
@theme {
  --color-navy: oklch(0.12 0.02 240);
  --color-gold: oklch(0.85 0.18 85);
  --color-accent-green: oklch(0.65 0.20 145);
  --color-action-red: oklch(0.60 0.25 25);
  --color-puzzle-purple: oklch(0.55 0.22 300);
  --color-sports-blue: oklch(0.50 0.20 240);
  --font-heading: "Press Start 2P", monospace;
  --font-body: system-ui, sans-serif;
}
```

---

### 3. **Build game data model + static game cards grid** (HIGH)

Create `src/data/games.ts` with initial game entries (World Cup Fantasy, F1 Fantasy, Football Fantasy). Each game object should include: `slug`, `title`, `description`, `category`, `thumbnail` (placeholder or asset path), `url` (external link), `featured` (boolean).

Build homepage with responsive game card grid using `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`.

**Why:** Core content and layout for the portal. Without games and cards, there's no portal.

**How to apply:**
1. Define `Game` type in `src/data/games.ts`
2. Export array of game objects with initial three sports sites
3. Create `src/components/GameCard.tsx` component (thumbnail, title, description, category badge, external link)
4. Render grid on homepage `src/app/page.tsx`

---

### 4. **Implement pixel font typography** (MEDIUM)

Load Press Start 2P from Google Fonts, apply to headings and game titles. Keep body text clean (system-ui or Source Sans 3 for readability).

**Why:** Typography is the fastest way to establish retro aesthetic. Pixel fonts instantly signal "retro game portal."

**How to apply:**
1. Add Google Fonts link in `src/app/layout.tsx` or use `next/font/google`
2. Define `--font-heading` in `@theme`
3. Apply to headings: `<h1 class="font-heading text-4xl">`

---

### 5. **Add category navigation** (MEDIUM)

Create category sidebar or top nav with categories: All Games, Sports, Prediction, Fantasy, etc. Filter game cards by category on click.

**Why:** Categories are a core UX pattern from AddictingGames/Miniclip. Users expect to browse by game type.

**How to apply:**
1. Add `categories` array to `src/data/games.ts` (extract unique categories from games)
2. Create `src/components/CategoryNav.tsx` with clickable category buttons
3. Add URL state or client-side filter to show/hide games by category

---

### 6. **Create featured games section** (LOW)

Add a hero section at top of homepage showcasing 1-2 featured games (larger cards, carousel optional). Mark games as `featured: true` in data model.

**Why:** Draws attention to most popular or newest games. Common pattern on retro portals.

**How to apply:**
1. Filter games by `featured: true` in data model
2. Render large card(s) above main grid
3. Style with gradient background or bold border to stand out

---

### 7. **Static generation for game detail pages (optional for v1)** (LOW)

If adding individual game detail pages (not just external links), use `generateStaticParams` to pre-render all pages at build time.

**Why:** SEO and performance for game-specific landing pages. Not critical if portal only links externally.

**How to apply:**
1. Create `src/app/games/[slug]/page.tsx` dynamic route
2. Export `generateStaticParams` fetching from `src/data/games.ts`
3. Export `generateMetadata` for SEO

---

## References

- [Next.js 16 App Router Guide](https://getcraftly.dev/blog/nextjs-16-app-router-guide)
- [Tailwind CSS v4.0 Announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind + Next.js Setup Guide](https://designrevision.com/blog/tailwind-nextjs-setup)
- [CSS Grid Mobile-First Approach](https://medium.com/codetodeploy/css-grid-responsive-design-the-mobile-first-approach-that-actually-works-194bdab9bc52)
- [20 Unique Pixel Fonts](https://creativemarket.com/blog/unique-pixel-fonts-80s)
- [38 Perfect Pixel Fonts for Video Game Design](https://designworklife.com/pixel-fonts-for-video-game-tech-design/)
- [43 Best Game & Arcade Fonts](https://design.tutsplus.com/articles/42-best-game-arcade-fonts-retro-pixel-video-game-styles--cms-93309)
