export type GameCategory = "Prediction" | "Fantasy";

export interface Game {
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  thumbnailColor: string;
  emoji: string;
  url: string;
  featured: boolean;
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
  },
];

export const categories: GameCategory[] = [...new Set(games.map((g) => g.category))];
