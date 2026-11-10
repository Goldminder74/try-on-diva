import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { getGuide } from "@/lib/guides";

export const Route = createFileRoute("/guides/$slug")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData: g }) => {
    if (!g) return { meta: [{ title: "Guide not found - Wigsmi" }, { name: "robots", content: "noindex" }] };
    const url = `https://wigsmi.com/guides/${g.slug}`;
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: g.metaTitle },
        { name: "description", content: g.metaDescription },
        { property: "og:title", content: g.metaTitle },
        { property: "og:description", content: g.metaDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: g.datePublished },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: g.metaTitle },
        { name: "twitter:description", content: g.metaDescription },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.metaDescription,
            datePublished: g.datePublished,
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Wigsmi" },
            publisher: { "@type": "Organization", name: "Wigsmi", url: "https://wigsmi.com" },
          }),
        },
        ...(g.faq.length
          ? [{
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: g.faq.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }]
          : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-mahogany">Guide not found</h1>
        <Link to="/guides" className="mt-6 inline-block text-mahogany underline">See all guides</Link>
      </main>
      <Footer />
    </div>
  ),
  component: GuidePage,
});

function GuidePage() {
  const g = Route.useLoaderData();
  const navigate = useNavigate();
  // Internal links inside the article stay in the app without a full reload.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!a || !href?.startsWith("/") || a.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    navigate({ href });
  };
  const date = new Date(`${g.datePublished}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto w-full max-w-[70ch] px-5 py-14">
        <Link to="/guides" className="font-mono text-xs uppercase tracking-wider text-gold-dark hover:text-mahogany">
          Wig buying guides
        </Link>
        <h1 className="mt-4 font-display text-4xl leading-tight text-mahogany md:text-5xl">{g.title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          <time dateTime={g.datePublished}>{date}</time> · {g.readingMinutes} min read
        </p>
        <article className="guide-prose mt-10" onClick={onClick} dangerouslySetInnerHTML={{ __html: g.html }} />
        <div className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
          <Link
            to="/try-on"
            className="inline-flex rounded-md bg-mahogany px-6 py-3 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
          >
            Try a style on yourself
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
