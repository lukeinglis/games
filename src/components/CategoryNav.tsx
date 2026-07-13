"use client";

import { useState } from "react";
import { categories, type GameCategory } from "@/data/games";

type Filter = "All" | GameCategory;

const filterEmojis: Record<string, string> = {
  All: "🎮",
  Sports: "🏟️",
  Racing: "🏁",
  Trivia: "🧠",
  Prediction: "🔮",
  Fantasy: "⭐",
  AI: "🤖",
};

export function CategoryNav({
  onFilter,
}: {
  onFilter: (category: Filter) => void;
}) {
  const [active, setActive] = useState<Filter>("All");

  const filters: Filter[] = ["All", ...categories];

  function handleClick(filter: Filter) {
    setActive(filter);
    onFilter(filter);
  }

  return (
    <nav className="flex flex-wrap gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => handleClick(filter)}
          className={`
            flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-heading uppercase tracking-wider
            transition-all duration-150 border
            ${
              active === filter
                ? "border-gold bg-gold/15 text-gold"
                : "border-transparent bg-navy-light text-gray-500 hover:text-gray-300 hover:bg-navy-lighter"
            }
          `}
        >
          <span className="text-sm">{filterEmojis[filter] ?? "🎮"}</span>
          {filter === "All" ? "All" : filter}
        </button>
      ))}
    </nav>
  );
}
