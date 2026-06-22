import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { RetailerPlanCards } from "@/components/retailer/RetailerPlanCards";

export const Route = createFileRoute("/retailer")({
  head: () => ({
    meta: [
      { title: "For Retailers — Wigsmi" },
      { name: "description", content: "Add the virtual try-on built for Black wig buyers to your store. Reduce returns, lift conversion. Free 1-month trial." },
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
            Fewer returns. More confident buyers. More sales.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-foreground/75">
            When customers can see exactly how a wig looks on their own skin tone before buying, they buy with confidence, and they keep what they buy.
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
              title: "Fewer returns",
              body: "Customers who try on before buying are far less likely to return a wig that did not meet their expectations.",
            },
            {
              title: "Higher conversion",
              body: "Reduce the hesitation that stops a browser becoming a buyer.",
            },
            {
              title: "Built for your exact customer",
              body: "The only try-on technology designed and validated for darker skin tones and natural Black hairstyles.",
            },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-xl text-mahogany">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-mahogany text-cream">
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
          <Link to="/retailer/signup" className="mt-8 inline-flex rounded-md bg-gold px-7 py-3 text-sm font-medium text-mahogany hover:bg-cream">
            Create retailer account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
