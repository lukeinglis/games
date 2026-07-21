export type GameCategory = "Sports" | "Racing" | "Trivia" | "Prediction" | "Fantasy" | "AI";

export interface Game {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  color: string;
  emoji: string;
  thumbnail?: string;
  url: string;
  featured: boolean;
  external?: boolean;
  hot?: boolean;
}

export const games: Game[] = [
  {
    slug: "breakaway",
    title: "Breakaway",
    tagline: "Endless runner",
    description: "Dodge tacklers and sprint for the end zone. Swipe or arrow keys to survive.",
    category: "Sports",
    color: "#D08770",
    emoji: "🏈",
    thumbnail: "/thumbnails/breakaway.png",
    url: "/games/breakaway",
    featured: true,
    hot: true,
  },
  {
    slug: "f1-racer",
    title: "F1 Racer",
    tagline: "Flappy-style",
    description: "Hold to fly, release to fall. Weave through team-colored barriers across Grand Prix circuits.",
    category: "Racing",
    color: "#E8002D",
    emoji: "🏎️",
    thumbnail: "/thumbnails/f1-racer.png",
    url: "/games/f1-racer",
    featured: true,
    hot: true,
  },
  {
    slug: "penalty-kick",
    title: "Penalty Kick",
    tagline: "Beat the keeper",
    description: "Pick your spot and fire. How long can you keep your scoring streak alive?",
    category: "Sports",
    color: "#1B5E20",
    emoji: "⚽",
    thumbnail: "/thumbnails/penalty-kick.png",
    url: "/games/penalty-kick",
    featured: false,
  },
  {
    slug: "field-goal",
    title: "Field Goal Frenzy",
    tagline: "Power + aim",
    description: "Nail the power meter and aim to kick field goals from increasing distances. Three misses and you are done.",
    category: "Sports",
    color: "#FF8000",
    emoji: "🏈",
    thumbnail: "/thumbnails/field-goal.png",
    url: "/games/field-goal",
    featured: true,
  },
  {
    slug: "guess-the-flag",
    title: "Guess the Flag",
    tagline: "Flag quiz",
    description: "Name the country from its flag before the clock runs out. One wrong answer ends it.",
    category: "Trivia",
    color: "#B48EAD",
    emoji: "🏴",
    thumbnail: "/thumbnails/guess-the-flag.png",
    url: "/games/guess-the-flag",
    featured: false,
  },
  {
    slug: "overfit",
    title: "Overfit!",
    tagline: "Fit the curve",
    description: "Draw a curve through noisy data points. Too simple is underfit, too wiggly is overfit. Find the sweet spot.",
    category: "AI",
    color: "#00BFA5",
    emoji: "📈",
    url: "/games/overfit",
    featured: false,
  },
  {
    slug: "token-blitz",
    title: "Token Blitz",
    tagline: "Count the tokens",
    description: "Guess how many tokens a sentence has. Test your BPE tokenizer intuition against the clock.",
    category: "AI",
    color: "#6366F1",
    emoji: "🔤",
    url: "/games/token-blitz",
    featured: false,
  },
  {
    slug: "wiki-race",
    title: "Wiki Race",
    tagline: "Wikipedia speedrun",
    description: "Spin the wheels, get two random articles, then race from start to target using only Wikipedia links.",
    category: "Trivia",
    color: "#3B82F6",
    emoji: "📖",
    thumbnail: "/thumbnails/wiki-race.png",
    url: "/games/wiki-race",
    featured: true,
    hot: true,
  },
  {
    slug: "hallucination-hunter",
    title: "Hallucination Hunter",
    tagline: "Spot the fakes",
    description: "Read paragraphs with hidden fabrications. Click the hallucinated sentences before your strikes run out.",
    category: "AI",
    color: "#F59E0B",
    emoji: "🔍",
    url: "/games/hallucination-hunter",
    featured: true,
    hot: true,
  },
  {
    slug: "world-cup-2026",
    title: "World Cup 2026 Fantasy",
    tagline: "Predict the bracket",
    description: "Predict group standings, pick knockout brackets, and compete with friends.",
    category: "Prediction",
    color: "#1B5E20",
    emoji: "⚽",
    url: "https://worldcup.lukeinglis.me",
    featured: false,
    external: true,
  },
  {
    slug: "f1-fantasy",
    title: "F1 Fantasy",
    tagline: "Build your team",
    description: "Build your dream racing team, predict results, and chase the championship.",
    category: "Fantasy",
    color: "#BF616A",
    emoji: "🏎️",
    url: "https://f1.lukeinglis.me",
    featured: false,
    external: true,
  },
];

export const categories: GameCategory[] = [...new Set(games.map((g) => g.category))];
