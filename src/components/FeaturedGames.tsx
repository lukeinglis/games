import Image from "next/image";
import Link from "next/link";
import { games } from "@/data/games";

export function FeaturedGames() {
  const featured = games.filter((g) => g.featured);
  if (featured.length === 0) return null;

  const hero = featured[0];
  const rest = featured.slice(1);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
        <h2 className="font-heading text-[10px] text-gold/80 uppercase tracking-widest">
          Featured
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-gold/50 to-transparent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <Link
          href={hero.url}
          className="lg:col-span-3 group relative rounded-lg overflow-hidden border border-navy-lighter hover:border-gold/60 transition-all"
        >
          <div className="h-48 sm:h-56 relative overflow-hidden">
            {hero.thumbnail ? (
              <Image
                src={hero.thumbnail}
                alt={hero.title}
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            ) : (
              <div
                className="h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${hero.color}cc, ${hero.color}66, #0A1628)` }}
              >
                <span className="text-7xl sm:text-8xl drop-shadow-lg">{hero.emoji}</span>
              </div>
            )}
            <div className="scanline-overlay" />
            {hero.hot && (
              <span className="absolute top-3 left-3 bg-action-red text-white text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider z-10">
                HOT
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-navy via-navy/90 to-transparent">
            <h3 className="font-heading text-sm text-white group-hover:text-gold transition-colors mb-1">
              {hero.title}
            </h3>
            <p className="text-xs text-gray-400">{hero.tagline}</p>
          </div>
        </Link>

        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {rest.map((game) => (
            <Link
              key={game.slug}
              href={game.url}
              className="group relative rounded-lg overflow-hidden border border-navy-lighter hover:border-gold/60 transition-all"
            >
              <div className="h-28 sm:h-full min-h-[7rem] relative overflow-hidden">
                {game.thumbnail ? (
                  <Image
                    src={game.thumbnail}
                    alt={game.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 1024px) 50vw, 20vw"
                  />
                ) : (
                  <div
                    className="h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${game.color}aa, ${game.color}55, #0A1628)` }}
                  >
                    <span className="text-3xl sm:text-4xl drop-shadow-lg">{game.emoji}</span>
                  </div>
                )}
                {game.hot && (
                  <span className="absolute top-2 right-2 bg-action-red text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase z-10">
                    HOT
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-navy via-navy/80 to-transparent">
                <h3 className="font-heading text-[8px] sm:text-[9px] text-white group-hover:text-gold transition-colors leading-tight">
                  {game.title}
                </h3>
                <p className="text-[9px] text-gray-500 hidden sm:block">{game.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
