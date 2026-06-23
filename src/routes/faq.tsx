import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - Wigsmi" },
      { name: "description", content: "Answers to common questions for wig buyers and retailers using Wigsmi." },
      { property: "og:title", content: "FAQ - Wigsmi" },
      { property: "og:description", content: "Answers to common questions for wig buyers and retailers using Wigsmi." },
    ],
  }),
  component: FAQPage,
});

type Tab = "buyers" | "retailers";

interface QA {
  q: string;
  a: string;
}

const BUYER_QA: QA[] = [
  {
    q: "How does the try-on actually work?",
    a: "Upload a clear, front-facing selfie, pick a wig from the catalog, and our AI generates a realistic image of you wearing that exact style. It takes a few seconds.",
  },
  {
    q: "Will it actually look like me, or a generic model?",
    a: "It's built specifically to preserve your real skin tone and face, validated across Fitzpatrick I to VI. The result shows the wig on your actual photo, not a stand-in model.",
  },
  {
    q: "Is my photo safe?",
    a: "Yes. Your photos are stored privately and securely, never made public, and never sold or used to train any third-party AI model. You can delete any saved photo at any time from your account.",
  },
  {
    q: "How many try-ons do I get for free?",
    a: "5 every month, forever, with no card required. The count resets on the 1st of each month.",
  },
  {
    q: "What happens when I run out of free try-ons?",
    a: "You can upgrade to Plus (£4.99/month) for unlimited try-ons, or wait until your free try-ons reset next month.",
  },
  {
    q: "What's the difference between Plus and Pro?",
    a: "Plus gives you unlimited try-ons, the ability to save your selfie for faster future try-ons, and the style quiz. Pro includes everything in Plus plus early access to new wig drops.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, anytime from your account settings. You'll keep access until the end of your current billing period.",
  },
  {
    q: "Do you sell the wigs I try on?",
    a: "No. Wigsmi is a try-on and discovery platform. When you find a wig you love, you buy it directly from the retailer selling it.",
  },
  {
    q: "Why doesn't the wig I received look identical to the try-on?",
    a: "Try-on results are AI-generated previews to help you choose with confidence. Lighting, photo quality, and natural product variation mean the real wig may differ slightly from the preview.",
  },
  {
    q: "I'm not happy with my Plus or Pro subscription, can I get a refund?",
    a: "Yes. Email support@wigsmi.com within 30 days of any payment for a full refund.",
  },
];

const RETAILER_QA: QA[] = [
  {
    q: "What does Wigsmi do for my store?",
    a: "We add a virtual try-on widget to your product pages so customers can see your exact wigs on their own face and skin tone before buying, built specifically for darker skin tones and natural Black hairstyles.",
  },
  {
    q: "How long does setup take?",
    a: "Most retailers are live within 15 minutes: sign up, upload your wigs, configure the widget, and paste one snippet into your store.",
  },
  {
    q: "What platforms does the widget work on?",
    a: "Currently optimised for Shopify. If you use a different platform, contact us at support@wigsmi.com to check compatibility.",
  },
  {
    q: "Do I need a credit card to start the free trial?",
    a: "No. Sign up and use the full platform for 1 month with no card required.",
  },
  {
    q: "What happens when my trial ends?",
    a: "You'll get reminder emails before it ends. If you don't subscribe to a plan, your wigs are automatically unpublished from the widget until you do. Your data and catalog are kept, nothing is deleted.",
  },
  {
    q: "What are the paid plans?",
    a: "Starter (£49/month, up to 30 wigs), Growth (£149/month, up to 150 wigs, full analytics), Pro (£399/month, unlimited wigs, multi-store, priority support). Yearly billing saves 35%.",
  },
  {
    q: "Can I upgrade or downgrade my plan later?",
    a: "Yes, anytime from your billing portal. Changes are prorated automatically.",
  },
  {
    q: "Do I keep ownership of my product images and descriptions?",
    a: "Yes, completely. You grant Wigsmi only the licence needed to display your catalog to shoppers browsing the platform.",
  },
  {
    q: "How does Wigsmi help reduce returns?",
    a: "Customers who see how a wig actually looks on their own skin tone before buying are far less likely to return it for not matching expectations.",
  },
  {
    q: "Who handles payments and is it secure?",
    a: "All payments are processed by Paddle, who acts as the merchant of record and handles billing, tax compliance and refunds securely on our behalf.",
  },
  {
    q: "How do I get help if I'm stuck?",
    a: "Email support@wigsmi.com. Starter and Growth plans get email support, Pro gets priority phone support.",
  },
];

function FAQPage() {
  const [tab, setTab] = useState<Tab>("buyers");
  const [query, setQuery] = useState("");

  const activeList = tab === "buyers" ? BUYER_QA : RETAILER_QA;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (item) =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [activeList, query]);

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-3xl px-5 py-16 md:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mahogany/30 bg-mahogany/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-mahogany">
            Help centre
          </span>
          <h1 className="mt-5 font-display text-4xl text-mahogany md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-lg text-foreground/75">
            Everything you need to know about trying on wigs and selling with Wigsmi.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-12">
        {/* Search */}
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-md border border-border bg-input py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20"
          />
        </div>

        {/* Tabs */}
        <div className="mb-8 inline-flex rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("buyers")}
            className={`rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
              tab === "buyers"
                ? "bg-mahogany text-cream"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            For wig buyers
          </button>
          <button
            type="button"
            onClick={() => setTab("retailers")}
            className={`rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
              tab === "retailers"
                ? "bg-mahogany text-cream"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            For retailers
          </button>
        </div>

        {/* Accordion */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions match your search. Try a different keyword or browse the other tab.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((item, i) => (
              <AccordionItem
                key={`${tab}-${i}`}
                value={`${tab}-${i}`}
                className="border-b border-border"
              >
                <AccordionTrigger className="py-4 text-left text-sm font-medium text-mahogany hover:underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-foreground/80">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Footer CTA */}
        <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
          <p className="font-display text-lg text-mahogany">
            Still have a question?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Email{" "}
            <a
              href="mailto:support@wigsmi.com"
              className="text-mahogany underline underline-offset-4 hover:text-mahogany-soft"
            >
              support@wigsmi.com
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
