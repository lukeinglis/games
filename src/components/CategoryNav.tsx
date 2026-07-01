"use client";

import { useState } from "react";
import { categories, type GameCategory } from "@/data/games";

type Filter = "All" | GameCategory;

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
    <nav className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => handleClick(filter)}
          className={`
            rounded-full px-4 py-2 text-xs font-heading uppercase tracking-wider
            border-2 transition-all duration-150
            ${
              active === filter
                ? "border-gold bg-gold text-navy"
                : "border-navy-lighter bg-navy-light text-gray-300 hover:border-gold hover:text-gold"
            }
          `}
        >
          {filter === "All" ? "All Games" : filter}
        </button>
      ))}
    </nav>
  );
}
