import { games } from "@/data/games";
import { GameCard } from "./GameCard";

export function FeaturedGames() {
  const featured = games.filter((g) => g.featured);

  if (featured.length === 0) return null;

  return (
    <section className="relative rounded-2xl bg-gradient-to-br from-navy-light via-navy to-navy-lighter p-6 sm:p-8 border-2 border-gold/30 overflow-hidden">
      <div className="scanline-overlay" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">&#11088;</span>
          <h2 className="font-heading text-sm sm:text-base text-gold uppercase tracking-wide">
            Featured Games
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {featured.map((game) => (
            <GameCard key={game.slug} game={game} size="large" />
          ))}
        </div>
      </div>
    </section>
  );
}
