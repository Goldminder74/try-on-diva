import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";

export const Route = createFileRoute("/retailer")({
  head: () => ({
    meta: [
      { title: "For Retailers — Wigsmi" },
      { name: "description", content: "Add the virtual try-on built for Black wig buyers to your store. Reduce returns, lift conversion. Free 3-month trial." },
      { property: "og:title", content: "Wigsmi for Retailers" },
      { property: "og:description", content: "Virtual try-on for wig retailers. Free 3-month trial." },
    ],
  }),
  component: RetailerLanding,
});

function RetailerLanding() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mahogany/30 bg-mahogany/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mahogany">
              For wig retailers
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-mahogany md:text-6xl">
              Give your customers <em className="italic text-sienna">the confidence</em> to buy.
            </h1>
            <p className="mt-5 max-w-md text-lg text-foreground/75">
              Add Wigsmi's virtual try-on to your store in minutes. Built for Black wig buyers.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/retailer" className="rounded-md bg-mahogany px-6 py-3 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft">
                Start 3-month free trial
              </Link>
              <a href="#pricing" className="text-sm font-medium text-mahogany underline-offset-4 hover:underline">See pricing →</a>
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">No card needed. Cancel any time.</p>
          </div>

          {/* Mock embed preview */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card-hover)]">
            <div className="flex items-center gap-1.5 border-b border-border pb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error/60"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-gold"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-success/60"></span>
              <span className="ml-3 font-mono text-[11px] text-muted-foreground">yourshop.co.uk/products/amara</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-md bg-sand"></div>
              <div>
                <p className="font-display text-xl text-foreground">Amara Body Wave 22"</p>
                <p className="mt-1 font-mono text-sm text-mahogany">£189</p>
                <button className="mt-4 w-full rounded-md bg-mahogany py-2 text-xs font-medium text-cream">Add to bag</button>
                <button className="mt-2 w-full rounded-md border border-gold bg-gold/10 py-2 text-xs font-medium text-mahogany">
                  ✨ Try it on with Wigsmi
                </button>
              </div>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-gold-dark">
              ↑ The Wigsmi widget on your product page
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-mahogany text-cream">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-5 py-14 md:grid-cols-3">
          {[
            ["Up to 300%", "more conversion"],
            ["12 try-ons", "average per visitor"],
            ["Up to 60%", "fewer returns"],
          ].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-4xl text-gold md:text-5xl">{n}</p>
              <p className="mt-1 text-sm text-cream/80">{l}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-cream/10 px-5 py-3 text-center font-mono text-[11px] text-cream/50">Typical results from early retailers</p>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="font-display text-3xl text-mahogany md:text-4xl">Three steps to live.</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "Sign up", body: "Create a retailer account in 60 seconds." },
            { icon: TrendingUp, title: "Upload your wigs", body: "Bulk import or add them one by one. Our team adds the AR assets." },
            { icon: Code2, title: "Paste one line of code", body: "Drop the embed snippet into Shopify, WooCommerce or any HTML. Done." },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-mahogany text-cream">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-mono text-xs text-gold-dark">Step {i + 1}</p>
              <h3 className="mt-1 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-border bg-sand/40">
        <div className="mx-auto w-full max-w-7xl px-5 py-20">
          <h2 className="font-display text-3xl text-mahogany md:text-4xl">Retailer pricing.</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">All plans start with a 3-month free trial. No card required.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Starter", price: "£49", limit: "30 wigs", best: "Solo founders" },
              { name: "Growth", price: "£149", limit: "150 wigs", best: "Growing brands", highlight: true },
              { name: "Pro", price: "£399", limit: "Unlimited wigs", best: "Multi-store retailers" },
              { name: "Enterprise", price: "Custom", limit: "Multi-region, white-label", best: "Established chains" },
            ].map(p => (
              <div
                key={p.name}
                className={`rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] ${p.highlight ? "border-gold ring-1 ring-gold" : "border-border"}`}
              >
                <p className="font-display text-xl text-mahogany">{p.name}</p>
                <p className="mt-3 font-mono text-3xl">{p.price}{p.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.best}</p>
                <p className="mt-4 text-sm">{p.limit}</p>
                <button className="mt-6 w-full rounded-md border border-mahogany py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream">
                  {p.price === "Custom" ? "Contact us" : "Start trial"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-mahogany text-cream">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            Join the first virtual try-on built for Black wig buyers.
          </h2>
          <Link to="/retailer" className="mt-8 inline-flex rounded-md bg-gold px-7 py-3 text-sm font-medium text-mahogany hover:bg-cream">
            Create retailer account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
