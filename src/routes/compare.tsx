import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/compare")({
  component: Compare,
});

function Compare() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <h1 className="mb-8 text-center font-display text-2xl text-mahogany">Option A vs Option B</h1>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Option A */}
        <div>
          <h2 className="mb-4 font-display text-xl text-mahogany">Option A — Honest CTA</h2>
          <section className="rounded-xl border-2 border-dashed border-gold/40 bg-sand/20 p-10 text-center">
            <p className="font-display text-xl italic text-mahogany">
              Be one of our first try-ons.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your story could be here.
            </p>
          </section>
        </div>

        {/* Option B */}
        <div>
          <h2 className="mb-4 font-display text-xl text-mahogany">Option B — What we built this for</h2>
          <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg text-mahogany mb-4">What we built this for</h3>
            <div className="space-y-4">
              <figure className="rounded-lg border border-border bg-cream/50 p-4">
                <blockquote className="font-display text-sm italic leading-snug text-foreground">
                  "We kept hearing the same story: a wig that looked perfect online, returned because it didn't match the wearer's skin or face shape."
                </blockquote>
              </figure>
              <figure className="rounded-lg border border-border bg-cream/50 p-4">
                <blockquote className="font-display text-sm italic leading-snug text-foreground">
                  "Most try-on tools were built for lighter skin tones. The colour matching came out washed out or completely off."
                </blockquote>
              </figure>
              <figure className="rounded-lg border border-border bg-cream/50 p-4">
                <blockquote className="font-display text-sm italic leading-snug text-foreground">
                  "Returns cost everyone — the buyer who waited weeks, the retailer who eats the cost, and the product that ends up in landfill."
                </blockquote>
              </figure>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
