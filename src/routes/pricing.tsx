import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Wigsmi" },
      { name: "description", content: "Wigsmi pricing for consumers. Start free with 5 try-ons a month, or go unlimited from £4.99/month." },
      { property: "og:title", content: "Pricing — Wigsmi" },
      { property: "og:description", content: "Free, Plus and Pro plans for Wigsmi consumers." },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
const PLANS = [
  {
    name: "Free", price: "£0", period: "forever", priceId: null,
    desc: "Browse the full catalog and try out the AI.",
    features: [
      [true, "5 try-ons per month"],
      [true, "Full catalog access"],
      [true, "Save up to 10 wigs"],
      [false, "Unlimited try-ons"],
      [false, "Style quiz personalisation"],
      [false, "Early access to new drops"],
    ] as const,
  },
  {
    name: "Plus", price: "£4.99", period: "per month", priceId: "consumer_plus_monthly",
    desc: "Unlimited try-ons and personalised picks.",
    badge: "Most popular",
    features: [
      [true, "Unlimited try-ons"],
      [true, "Full catalog access"],
      [true, "Unlimited wishlist"],
      [true, "Style quiz personalisation"],
      [true, "Save your selfie"],
      [false, "Early access to new drops"],
    ] as const,
  },
  {
    name: "Pro", price: "£9.99", period: "per month", priceId: "consumer_pro_monthly",
    desc: "Everything, plus first-look at new arrivals.",
    features: [
      [true, "Everything in Plus"],
      [true, "Early access to new drops"],
      [true, "Priority support"],
      [true, "Exclusive style edits"],
      [true, "Annual saves 35%"],
    ] as const,
  },
];

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openCheckout, loading } = usePaddleCheckout();

  const onChoose = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      navigate({ to: "/auth/signup" });
      return;
    }
    if (!user) {
      navigate({ to: "/auth/login", search: { redirect: "/pricing" } as any });
      return;
    }
    try {
      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id, plan: planName },
        successUrl: `${window.location.origin}/checkout/success`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Pricing</p>
          <h1 className="mt-2 font-display text-5xl text-mahogany md:text-6xl">Simple. Warm. Yours.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">Start free. Upgrade only if Wigsmi becomes part of your routine.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map(p => (
            <div
              key={p.name}
              className={`relative rounded-xl border bg-card p-7 shadow-[var(--shadow-card)] ${
                p.badge ? "border-gold ring-1 ring-gold" : "border-border"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-7 rounded-full bg-gold px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">
                  {p.badge}
                </span>
              )}
              <p className="font-display text-2xl text-mahogany">{p.name}</p>
              <p className="mt-3 font-mono text-4xl text-foreground">{p.price}</p>
              <p className="text-xs text-muted-foreground">{p.period}</p>
              <p className="mt-4 text-sm text-foreground/80">{p.desc}</p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map(([on, label], i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {on
                      ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />}
                    <span className={on ? "text-foreground" : "text-muted-foreground line-through"}>{label}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/try-on"
                className={`mt-7 block rounded-md py-2.5 text-center text-sm font-medium transition-all ${
                  p.badge
                    ? "bg-mahogany text-cream hover:bg-mahogany-soft"
                    : "border border-mahogany text-mahogany hover:bg-mahogany hover:text-cream"
                }`}
              >
                {p.name === "Free" ? "Start free" : `Choose ${p.name}`}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Are you a wig retailer? <Link to="/retailer" className="text-mahogany underline">See retailer plans →</Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
