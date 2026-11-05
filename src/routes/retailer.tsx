import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { RetailerPlanCards } from "@/components/retailer/RetailerPlanCards";

export const Route = createFileRoute("/retailer")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://wigsmi.com/retailer" }],
    meta: [
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://wigsmi.com/retailer" },
      { title: "For Retailers - Wigsmi" },
      { name: "description", content: "Add Wigsmi virtual wig try-on to your store. Help shoppers explore your collection with a free 1-month retailer trial." },
      { property: "og:title", content: "Wigsmi for Retailers" },
      { property: "og:description", content: "Virtual try-on for wig retailers. Free 1-month trial." },
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
        <div className="mx-auto w-full max-w-7xl px-5 py-16 md:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mahogany/30 bg-mahogany/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mahogany">
            For wig retailers
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] text-mahogany md:text-6xl">
            Your collection. A more personal shopping experience.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/75">
            Help shoppers preview your wigs on their own selfie before visiting your shop to buy. AI previews are illustrative, not a guarantee of fit or colour.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/retailer/signup" className="rounded-md bg-mahogany px-6 py-3 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft">
              Start 1-month free trial
            </Link>
            <Link to="/retailer/login" className="text-sm font-medium text-mahogany underline-offset-4 hover:underline">
              Retailer login →
            </Link>
            <a href="#pricing" className="text-sm font-medium text-mahogany underline-offset-4 hover:underline">See pricing →</a>
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">No card needed. Cancel any time.</p>
        </div>
      </section>

      {/* Outcome points */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "Preview before purchase",
              body: "Give customers another way to explore a style before ordering.",
            },
            {
              title: "Learn from your shoppers",
              body: "Use your pilot to understand which styles attract interest and what questions shoppers still have.",
            },
            {
              title: "Built for your exact customer",
              body: "A wig-shopping experience created with Black women in mind.",
            },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-xl text-mahogany">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-mahogany text-cream">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-5 py-14 md:grid-cols-3">
          {[
            ["1 month", "free retailer trial"],
            ["Your wigs", "your verified product links"],
            ["Your shop", "where customers buy"],
          ].map(([n, l]) => (
            <div key={l}>
              <p className="font-display text-4xl text-gold md:text-5xl">{n}</p>
              <p className="mt-1 text-sm text-cream/80">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-7xl px-5 py-20">
        <h2 className="font-display text-3xl text-mahogany md:text-4xl">Three steps to live.</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: "Sign up", body: "Create a retailer account in 60 seconds." },
            { icon: TrendingUp, title: "Upload your wigs", body: "Add permission-cleared product photos, descriptions, prices and exact buying links." },
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
          <p className="mt-2 max-w-md text-sm text-muted-foreground">All plans start with a 1-month free trial. No card required.</p>
          <div className="mt-10">
            <RetailerPlanCards requireSignup />
          </div>
          <div className="mt-8 rounded-xl border border-border bg-card p-6 md:flex md:items-center md:justify-between">
            <div>
              <p className="font-display text-xl text-mahogany">Enterprise</p>
              <p className="mt-1 text-sm text-muted-foreground">Multi-region, white-label, custom integrations.</p>
            </div>
            <a
              href="mailto:hello@wigsmi.com"
              className="mt-4 inline-flex rounded-md border border-mahogany px-5 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream md:mt-0"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>


      {/* FAQ teaser */}
      <section className="border-y border-border bg-sand/40">
        <div className="mx-auto w-full max-w-3xl px-5 py-14 text-center">
          <p className="font-display text-xl text-mahogany">Questions before you start?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            See answers to common retailer questions.
          </p>
          <Link
            to="/faq"
            className="mt-4 inline-flex rounded-md border border-mahogany px-5 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream"
          >
            Read retailer FAQ
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-mahogany text-cream">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-4 font-display text-4xl md:text-5xl">
            Join the first virtual try-on built for Black wig buyers.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/retailer/signup" className="inline-flex rounded-md bg-gold px-7 py-3 text-sm font-medium text-mahogany hover:bg-cream">
              Create retailer account
            </Link>
            <a
              href="/wigsmi-brochure.pdf"
              download
              className="inline-flex rounded-md border border-cream/50 px-7 py-3 text-sm font-medium text-cream hover:bg-cream hover:text-mahogany"
            >
              Download the brochure (PDF)
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
