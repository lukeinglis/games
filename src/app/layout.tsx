import type { Metadata } from "next";
import Link from "next/link";
import { Press_Start_2P, Source_Sans_3 } from "next/font/google";
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
  title: "Games Portal",
  description:
    "A retro games portal linking to sports fantasy and prediction games.",
};

const siteLinks = [
  { label: "World Cup Fantasy", href: "https://worldcup.lukeinglis.me" },
  { label: "F1 Fantasy", href: "https://f1.lukeinglis.com" },
  { label: "Football Fantasy", href: "https://football.lukeinglis.com" },
];

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
        <header className="relative bg-gradient-to-r from-navy via-navy-lighter to-navy border-b-4 border-gold">
          <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl">🕹️</span>
              <span className="font-heading text-sm sm:text-base text-gold tracking-wide">
                GAMES PORTAL
              </span>
            </Link>
            <span className="hidden sm:inline font-heading text-[8px] text-gray-500 uppercase">
              Play. Predict. Win.
            </span>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t-2 border-navy-lighter bg-navy-light">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-heading text-[8px] text-gray-500">
                GAMES PORTAL
              </span>
              <nav className="flex flex-wrap gap-4">
                {siteLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
