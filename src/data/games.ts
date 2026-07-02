export type GameCategory = "Sports" | "Racing" | "Trivia" | "Prediction" | "Fantasy";

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
    color: "#DD550C",
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
    featured: true,
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
    color: "#AA00FF",
    emoji: "🏴",
    thumbnail: "/thumbnails/guess-the-flag.png",
    url: "/games/guess-the-flag",
    featured: true,
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
    color: "#FF1744",
    emoji: "🏎️",
    url: "https://f1.lukeinglis.me",
    featured: false,
    external: true,
  },
];

export const categories: GameCategory[] = [...new Set(games.map((g) => g.category))];
