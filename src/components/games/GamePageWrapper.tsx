"use client";

import Link from "next/link";

export default function GamePageWrapper({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description?: string;
  controls?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors font-heading uppercase tracking-wide"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-white/10" />
        <h1 className="font-heading text-xs sm:text-sm text-gold uppercase tracking-wide">
          {title}
        </h1>
      </div>

      {(description || controls) && (
        <div className="flex items-start gap-3 mb-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
          <span className="text-base mt-0.5 shrink-0">ℹ️</span>
          <div className="text-sm text-gray-400 space-y-1">
            {description && <p>{description}</p>}
            {controls && <p className="text-gray-500 text-xs">{controls}</p>}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
