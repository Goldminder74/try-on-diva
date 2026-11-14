import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { listGuides } from "@/lib/guides";

const TITLE = "Wig buying guides - Wigsmi";
const DESC = "Plain-language guides to choosing, wearing and caring for wigs.";

export const Route = createFileRoute("/guides/")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://wigsmi.com/guides" }],
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://wigsmi.com/guides" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  const guides = listGuides();
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-5 py-16">
        <h1 className="font-display text-4xl text-mahogany md:text-5xl">Wig buying guides</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{DESC}</p>
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="block h-full rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-gold"
              >
                <h2 className="font-display text-2xl text-mahogany">{g.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {g.metaDescription}
                </p>
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-gold-dark">
                  {g.readingMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
