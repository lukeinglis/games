"use client";

import { useState } from "react";
import { games, type GameCategory } from "@/data/games";
import { GameCard } from "@/components/GameCard";
import { CategoryNav } from "@/components/CategoryNav";
import { FeaturedGames } from "@/components/FeaturedGames";

type Filter = "All" | GameCategory;

export default function Home() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered =
    filter === "All" ? games : games.filter((g) => g.category === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <FeaturedGames />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="font-heading text-xs sm:text-sm text-white uppercase tracking-wide">
          All Games
        </h2>
        <CategoryNav onFilter={setFilter} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 font-heading text-xs py-12">
          No games in this category yet.
        </p>
      )}
    </div>
  );
}
