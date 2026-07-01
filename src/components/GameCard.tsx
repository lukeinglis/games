import Link from "next/link";
import { Game } from "@/data/games";

const categoryColors: Record<string, string> = {
  Prediction: "bg-accent-green text-navy",
  Fantasy: "bg-gold text-navy",
  Sports: "bg-sports-blue text-white",
  Racing: "bg-action-red text-white",
  Trivia: "bg-puzzle-purple text-white",
};

export function GameCard({ game, size = "normal" }: { game: Game; size?: "normal" | "large" }) {
  const isLarge = size === "large";
  const isExternal = game.external ?? game.url.startsWith("http");

  const wrapperClass = `
    group block rounded-2xl border-2 border-navy-lighter bg-navy-light
    transition-all duration-200
    hover:border-gold hover:glow-gold hover:scale-[1.02]
    ${isLarge ? "p-6" : "p-4"}
  `;

  const inner = (
    <>
      <div
        className={`
          flex items-center justify-center rounded-xl
          ${isLarge ? "h-40 text-6xl mb-4" : "h-28 text-5xl mb-3"}
        `}
        style={{ backgroundColor: game.thumbnailColor }}
      >
        <span role="img" aria-label={game.title}>
          {game.emoji}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3
          className={`
            font-heading leading-tight text-white
            group-hover:text-gold transition-colors
            ${isLarge ? "text-sm" : "text-xs"}
          `}
        >
          {game.title}
        </h3>
        <span
          className={`
            shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide
            ${categoryColors[game.category] ?? "bg-sports-blue text-white"}
          `}
        >
          {game.category}
        </span>
      </div>

      <p className={`text-sm text-gray-400 leading-relaxed ${isLarge ? "mb-4" : "mb-3"}`}>
        {game.description}
      </p>

      <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gold group-hover:text-accent-green transition-colors">
        Play Now
        <svg
          className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={game.url}
        target="_blank"
        rel="noopener noreferrer"
        className={wrapperClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={game.url} className={wrapperClass}>
      {inner}
    </Link>
  );
}
