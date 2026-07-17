import type { Metadata } from "next";
import Link from "next/link";
import { Press_Start_2P, Source_Sans_3 } from "next/font/google";
import ReportBug from "@/components/ReportBug";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luke's Arcade",
  description: "Mini games, sports challenges, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${sourceSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <header className="hero-banner">
          <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">🕹️</span>
              <div className="flex flex-col">
                <span className="font-heading text-base sm:text-lg text-gold tracking-wider drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                  LUKE&apos;S ARCADE
                </span>
                <span className="text-[10px] text-gold/50 tracking-widest uppercase">
                  est. 2025
                </span>
              </div>
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link href="/" className="text-xs text-gray-400 hover:text-gold transition-colors font-heading uppercase">
                Home
              </Link>
            </nav>
          </div>
        </header>

        <div className="ticker-tape py-1">
          <div className="animate-marquee inline-block">
            <span className="font-heading text-[10px] text-navy font-bold tracking-wider">
              &nbsp;&nbsp;🔥 NEW: <Link href="/games/f1-racer" className="hover:underline">F1 Racer</Link> &nbsp;&nbsp;⚽ <Link href="/games/penalty-kick" className="hover:underline">Penalty Kick</Link> &nbsp;&nbsp;🏈 <Link href="/games/breakaway" className="hover:underline">Breakaway</Link> &nbsp;&nbsp;🏴 <Link href="/games/guess-the-flag" className="hover:underline">Guess the Flag</Link> &nbsp;&nbsp;🏈 <Link href="/games/field-goal" className="hover:underline">Field Goal Frenzy</Link> &nbsp;&nbsp;🏎️ <Link href="/games/f1-racer" className="hover:underline">F1 Racer</Link> &nbsp;&nbsp;
              🔥 NEW: <Link href="/games/f1-racer" className="hover:underline">F1 Racer</Link> &nbsp;&nbsp;⚽ <Link href="/games/penalty-kick" className="hover:underline">Penalty Kick</Link> &nbsp;&nbsp;🏈 <Link href="/games/breakaway" className="hover:underline">Breakaway</Link> &nbsp;&nbsp;🏴 <Link href="/games/guess-the-flag" className="hover:underline">Guess the Flag</Link> &nbsp;&nbsp;🏈 <Link href="/games/field-goal" className="hover:underline">Field Goal Frenzy</Link> &nbsp;&nbsp;🏎️ <Link href="/games/f1-racer" className="hover:underline">F1 Racer</Link> &nbsp;&nbsp;
            </span>
          </div>
        </div>

        <main className="flex-1">{children}</main>
        <ReportBug />

        <footer className="border-t border-navy-lighter bg-navy-light/50 mt-12">
          <div className="max-w-6xl mx-auto px-4 py-6 text-center">
            <p className="text-xs text-gray-600">
              Made for fun by Luke Inglis
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
