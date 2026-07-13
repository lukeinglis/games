import Image from "next/image";
import Link from "next/link";
import { Game } from "@/data/games";

const categoryColors: Record<string, string> = {
  Prediction: "bg-accent-green/20 text-accent-green border-accent-green/40",
  Fantasy: "bg-gold/20 text-gold border-gold/40",
  Sports: "bg-sports-blue/20 text-sports-blue border-sports-blue/40",
  Racing: "bg-action-red/20 text-action-red border-action-red/40",
  Trivia: "bg-puzzle-purple/20 text-puzzle-purple border-puzzle-purple/40",
};

export function GameCard({ game }: { game: Game }) {
  const isExternal = game.external ?? game.url.startsWith("http");

  const card = (
    <div className="group relative rounded-lg border border-navy-lighter bg-navy-light/80 hover:border-gold/60 transition-all duration-200 hover:translate-y-[-2px] overflow-hidden cursor-pointer">
      {game.hot && (
        <div className="absolute top-2 right-2 z-10 bg-action-red text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider animate-pulse-glow">
          HOT
        </div>
      )}

      <div className="h-28 relative overflow-hidden">
        {game.thumbnail ? (
          <Image
            src={game.thumbnail}
            alt={game.title}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div
            className="h-full flex items-center justify-center text-4xl"
            style={{ background: `linear-gradient(135deg, ${game.color}dd, ${game.color}88)` }}
          >
            <span className="drop-shadow-lg group-hover:scale-125 transition-transform duration-200">
              {game.emoji}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-navy-light to-transparent" />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-heading text-[10px] text-white group-hover:text-gold transition-colors leading-tight">
            {game.title}
          </h3>
        </div>

        <p className="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">
          {game.description}
        </p>

        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${categoryColors[game.category] ?? "bg-sports-blue/20 text-sports-blue border-sports-blue/40"}`}>
            {game.category}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold/70 group-hover:text-gold transition-colors">
            {isExternal ? "Visit →" : "Play →"}
          </span>
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={game.url} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return <Link href={game.url}>{card}</Link>;
}
