import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Upload, Heart, ShieldCheck, Palette } from "lucide-react";
import heroModel from "@/assets/hero-model.jpg";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { WigCard } from "@/components/wigsmi/WigCard";
import { WigCardSkeleton } from "@/components/wigsmi/WigCardSkeleton";
import { fetchFeaturedWigs, type Wig } from "@/lib/wigs";
import { useAsync } from "@/lib/use-async";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wigsmi — Try every wig before you buy it" },
      { name: "description", content: "Virtual wig try-on built for Black women. Browse hundreds of styles, see them on your skin in seconds, then buy from the retailer you trust." },
      { property: "og:title", content: "Wigsmi — Try every wig before you buy it" },
      { property: "og:description", content: "Virtual wig try-on built for Black women." },
    ],
  }),
  component: Landing,
});

const TESTIMONIALS = [
  { initials: "AO", name: "Adaobi O.", quote: "I've ordered three wigs that looked perfect online and ended up donating them. Wigsmi is the first thing that actually shows me the wig on my skin." },
  { initials: "TM", name: "Tasha M.", quote: "The deep wave I tried on looked exactly like it did when it arrived. Game changer for online shopping." },
  { initials: "FK", name: "Fola K.", quote: "Finally a try-on that gets dark skin right. The colour matching is unreal." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-gold-dark">
              <Sparkles className="h-3 w-3" /> AI try-on, free to start
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-mahogany md:text-6xl lg:text-7xl">
              Try every wig <em className="italic text-sienna">before</em> you buy it.
            </h1>
            <p className="mt-6 max-w-md text-lg text-foreground/75">
              Built for Black women. Powered by AI. Works on every shade — from fair to rich.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/try-on" className="rounded-md bg-mahogany px-6 py-3 text-sm font-medium text-cream shadow-sm transition-all hover:bg-mahogany-soft hover:shadow-md">
                Try for free
              </Link>
              <Link to="/retailer" className="text-sm font-medium text-mahogany underline-offset-4 hover:underline">
                I'm a retailer →
              </Link>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">No card needed. 3 free try-ons.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -rotate-2 rounded-2xl bg-gold/20" aria-hidden />
            <img
              src={heroModel}
              alt="Black woman wearing a flowing mahogany wave wig in warm studio light"
              width={1024}
              height={1024}
              className="relative aspect-square w-full rounded-2xl object-cover shadow-[0_20px_60px_-20px_rgba(61,28,2,0.4)]"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-sand/40">
        <div className="mx-auto w-full max-w-7xl px-5 py-16">
          <h2 className="font-display text-3xl text-mahogany md:text-4xl">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Upload, title: "Upload your selfie", body: "A clear, well-lit photo is all we need." },
              { icon: Palette, title: "Browse hundreds of styles", body: "Lace fronts, glueless, braids, bobs — filtered by your texture and budget." },
              { icon: Heart, title: "Find your perfect wig", body: "See it on you, save your favourites, buy from a retailer you trust." },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mahogany text-cream">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-mono text-xs text-gold-dark">Step {i + 1}</p>
                <h3 className="mt-1 font-display text-xl text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Wigsmi */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="font-display text-3xl text-mahogany md:text-4xl">Why Wigsmi</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Built for dark skin", body: "Trained on tones from Fitzpatrick I to VI. No washed-out previews, no off colour matching." },
            { icon: Sparkles, title: "Afrocentric styles", body: "From kinky coily afros to knotless braids to body wave — the catalog reflects you." },
            { icon: Heart, title: "Try before you buy", body: "Save the styles that work. Skip the styles that don't. Reduce returns and regret." },
          ].map((c, i) => (
            <div key={i} className="card-hover rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
              <c.icon className="h-6 w-6 text-gold-dark" />
              <h3 className="mt-4 font-display text-xl text-mahogany">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog preview */}
      <section className="border-t border-border bg-sand/40">
        <div className="mx-auto w-full max-w-7xl px-5 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-mahogany md:text-4xl">Trending styles</h2>
              <p className="mt-2 text-sm text-muted-foreground">Most-tried wigs this week.</p>
            </div>
            <Link to="/catalog" className="hidden text-sm font-medium text-mahogany underline-offset-4 hover:underline md:inline">
              View all →
            </Link>
          </div>
          <FeaturedRow />
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="font-display text-3xl text-mahogany md:text-4xl">Loved by Black wig buyers</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
              <blockquote className="font-display text-lg italic leading-snug text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mahogany font-mono text-xs text-cream">{t.initials}</span>
                <span className="text-sm text-muted-foreground">{t.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-t border-border bg-mahogany text-cream">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 text-center">
          <h2 className="font-display text-4xl md:text-5xl">Start free.<br/>Upgrade when you fall in love.</h2>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 text-left md:grid-cols-3">
            {[
              { name: "Free", price: "£0", desc: "5 try-ons / month. Browse the full catalog." },
              { name: "Plus", price: "£4.99", desc: "Unlimited try-ons. Save your photo. Style quiz." , badge: true },
              { name: "Pro", price: "£9.99", desc: "Everything in Plus, plus early access to new drops." },
            ].map((p) => (
              <div key={p.name} className={`rounded-xl border p-6 ${p.badge ? "border-gold bg-cream/5" : "border-cream/15"}`}>
                {p.badge && <span className="font-mono text-[10px] uppercase tracking-wider text-gold">Most popular</span>}
                <p className="mt-1 font-display text-2xl">{p.name}</p>
                <p className="mt-2 font-mono text-3xl text-gold">{p.price}<span className="text-sm text-cream/60">/mo</span></p>
                <p className="mt-3 text-sm text-cream/75">{p.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/try-on" className="mt-10 inline-flex rounded-md bg-gold px-7 py-3 text-sm font-medium text-mahogany shadow-sm hover:bg-gold-dark hover:text-cream">
            Start free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeaturedRow() {
  const { data, loading } = useAsync<Wig[]>(() => fetchFeaturedWigs(5), []);
  if (loading) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <WigCardSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {(data ?? []).map((w) => <WigCard key={w.id} wig={w} />)}
    </div>
  );
}
