export type GameCategory = "Prediction" | "Fantasy" | "Sports" | "Racing" | "Trivia";

export interface Game {
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnailColor: string;
  emoji: string;
  url: string;
  featured: boolean;
  external?: boolean;
}

export const games: Game[] = [
  {
    slug: "world-cup-2026",
    title: "World Cup 2026 Fantasy",
    description:
      "Predict group standings, pick knockout brackets, and compete with friends for World Cup glory.",
    category: "Prediction",
    thumbnailColor: "#1B5E20",
    emoji: "⚽",
    url: "https://worldcup.lukeinglis.me",
    featured: true,
    external: true,
  },
  {
    slug: "f1-fantasy",
    title: "F1 Fantasy",
    description:
      "Build your dream racing team, predict race results, and chase the championship.",
    category: "Fantasy",
    thumbnailColor: "#FF1744",
    emoji: "🏎️",
    url: "https://f1.lukeinglis.com",
    featured: true,
    external: true,
  },
  {
    slug: "football-fantasy",
    title: "Football Fantasy",
    description:
      "Draft players, set lineups, and battle your mates in the ultimate football fantasy league.",
    category: "Fantasy",
    thumbnailColor: "#2979FF",
    emoji: "🏈",
    url: "https://football.lukeinglis.com",
    featured: false,
    external: true,
  },
  {
    slug: "penalty-kick",
    title: "Penalty Kick",
    description:
      "Pick your spot and beat the keeper. How long can you keep your scoring streak alive?",
    category: "Sports",
    thumbnailColor: "#1B5E20",
    emoji: "⚽",
    url: "/games/penalty-kick",
    featured: true,
  },
  {
    slug: "guess-the-flag",
    title: "Guess the Flag",
    description:
      "Identify World Cup 2026 team flags before time runs out. One wrong answer and it is game over.",
    category: "Trivia",
    thumbnailColor: "#AA00FF",
    emoji: "🏴",
    url: "/games/guess-the-flag",
    featured: false,
  },
  {
    slug: "breakaway",
    title: "Breakaway",
    description:
      "Dodge tacklers and sprint for the end zone in this endless runner. Swipe or use arrow keys to survive.",
    category: "Sports",
    thumbnailColor: "#DD550C",
    emoji: "🏈",
    url: "/games/breakaway",
    featured: true,
  },
  {
    slug: "field-goal",
    title: "Field Goal Frenzy",
    description:
      "Nail the power and aim to kick field goals from increasing distances. Three misses and you are out.",
    category: "Sports",
    thumbnailColor: "#FF8000",
    emoji: "🏈",
    url: "/games/field-goal",
    featured: false,
  },
  {
    slug: "f1-racer",
    title: "F1 Racer",
    description:
      "Hold to fly, release to fall. Weave through team-colored barriers in this F1 dodge challenge.",
    category: "Racing",
    thumbnailColor: "#E8002D",
    emoji: "🏎️",
    url: "/games/f1-racer",
    featured: true,
  },
];

export const categories: GameCategory[] = [...new Set(games.map((g) => g.category))];
