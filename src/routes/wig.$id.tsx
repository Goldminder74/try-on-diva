import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ExternalLink, ArrowLeft } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { WigCard } from "@/components/wigsmi/WigCard";
import { WIGS, getWigById, formatPrice } from "@/lib/wigs";

export const Route = createFileRoute("/wig/$id")({
  loader: ({ params }) => {
    const wig = getWigById(params.id);
    if (!wig) throw notFound();
    return { wig };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.wig.name} — Wigsmi` },
      { name: "description", content: loaderData.wig.description },
      { property: "og:title", content: `${loaderData.wig.name} — Wigsmi` },
      { property: "og:description", content: loaderData.wig.description },
      { property: "og:image", content: loaderData.wig.images[0] },
    ] : [],
  }),
  component: WigDetail,
  notFoundComponent: () => (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-4xl text-mahogany">Wig not found.</h1>
        <p className="mt-3 text-sm text-muted-foreground">It may have been removed or the link is wrong.</p>
        <Link to="/catalog" className="mt-6 inline-flex rounded-md bg-mahogany px-5 py-2 text-sm text-cream">Back to catalog</Link>
      </div>
      <Footer />
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-cream">
        <Header />
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <h1 className="font-display text-3xl text-mahogany">Couldn't load this wig.</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-6 rounded-md bg-mahogany px-5 py-2 text-sm text-cream"
          >Try again</button>
        </div>
        <Footer />
      </div>
    );
  },
});

function WigDetail() {
  const { wig } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const related = WIGS.filter(w => w.style_type === wig.style_type && w.id !== wig.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-5 py-8">
        <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-mahogany">
          <ArrowLeft className="h-4 w-4" /> Catalog
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-sand">
              <img src={wig.images[active]} alt={wig.name} className="h-full w-full object-cover" />
            </div>
            {wig.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {wig.images.map((src: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`h-16 w-16 overflow-hidden rounded-md border-2 ${i === active ? "border-mahogany" : "border-transparent"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">{wig.retailer}</p>
            <h1 className="mt-2 font-display text-4xl text-mahogany">{wig.name}</h1>
            <p className="mt-3 font-mono text-2xl text-foreground">{formatPrice(wig.price, wig.currency)}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {[wig.style_type, wig.hair_texture, wig.hair_length, wig.hair_origin].map(t => (
                <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">{t}</span>
              ))}
            </div>

            <p className="mt-6 leading-relaxed text-foreground/80">{wig.description}</p>

            <p className="mt-5 text-xs text-muted-foreground">
              <span className="font-mono text-gold-dark">{wig.try_on_count.toLocaleString()}</span> people have tried this on.
            </p>

            <div className="mt-7 space-y-3">
              <Link
                to="/try-on"
                search={{ wig: wig.id }}
                className="flex w-full items-center justify-center rounded-md bg-mahogany px-5 py-3 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
              >
                Try this wig on
              </Link>
              <button className="flex w-full items-center justify-center gap-2 rounded-md border border-mahogany bg-transparent px-5 py-3 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream">
                <Heart className="h-4 w-4" /> Save to wishlist
              </button>
              <a
                href={wig.product_url}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream"
              >
                <ExternalLink className="h-4 w-4" /> Buy from {wig.retailer}
              </a>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl text-mahogany">You might also like</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map(w => <WigCard key={w.id} wig={w} />)}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
