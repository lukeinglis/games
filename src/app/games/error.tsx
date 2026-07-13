"use client";

import Link from "next/link";

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💥</div>
        <h1 className="font-heading text-xl text-gold mb-4 leading-relaxed">
          GAME OVER
        </h1>
        <p className="text-gray-300 mb-6">Something went wrong loading this game.</p>
        <pre className="bg-navy-light border border-navy-lighter rounded p-3 mb-8 text-xs text-gray-400 text-left overflow-x-auto">
          {error.message}
        </pre>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="font-heading text-xs px-6 py-3 bg-accent-green text-navy font-bold rounded hover:brightness-110 transition-all cursor-pointer"
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            className="font-heading text-xs px-6 py-3 border border-gold/40 text-gold rounded hover:bg-gold/10 transition-all"
          >
            BACK TO ARCADE
          </Link>
        </div>
      </div>
    </div>
  );
}
