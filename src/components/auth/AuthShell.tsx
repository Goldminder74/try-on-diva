import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/wigsmi/Wordmark";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center px-5">
        <Link to="/" className="flex items-center"><Wordmark size="md" /></Link>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col px-5 pb-20 pt-6 md:flex-row md:items-stretch md:gap-16 md:pt-12">
        <div className="flex-1">{children}</div>
        <aside className="mt-12 hidden flex-1 md:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-sand/40 p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Why Wigsmi</p>
            <h2 className="mt-2 font-display text-3xl text-mahogany">Designed for our hair, our skin, our style.</h2>
            <ul className="mt-5 space-y-3 text-sm text-foreground/80">
              <li>- Try wigs on with a single selfie.</li>
              <li>- Curated picks from Black-owned and Black-focused retailers.</li>
              <li>- Save your favourites and pick up from any device.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
