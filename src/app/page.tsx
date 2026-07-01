"use client";

import { useState } from "react";
import { games, type GameCategory } from "@/data/games";
import { GameCard } from "@/components/GameCard";
import { CategoryNav } from "@/components/CategoryNav";
import { FeaturedGames } from "@/components/FeaturedGames";

type Filter = "All" | GameCategory;

export default function Home() {
  const [filter, setFilter] = useState<Filter>("All");

  const allGames = filter === "All" ? games : games.filter((g) => g.category === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <FeaturedGames />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <h2 className="font-heading text-[10px] text-gray-500 uppercase tracking-widest">
          All Games
        </h2>
        <CategoryNav onFilter={setFilter} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allGames.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
      </div>

      {allGames.length === 0 && (
        <p className="text-center text-gray-600 text-sm py-12">
          No games in this category yet.
        </p>
      )}
    </div>
  );
}
