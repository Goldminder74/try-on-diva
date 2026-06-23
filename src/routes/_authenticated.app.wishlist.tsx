import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listWishlist, toggleWishlist } from "@/lib/wishlist.functions";
import { formatPrice } from "@/lib/wigs";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist - Wigsmi" }] }),
  component: Wishlist,
});

type Item = {
  wig_id: string;
  wigs: {
    id: string;
    name: string;
    price: number;
    currency: string;
    images: string[];
    style_type: string;
    retailers: { display_name: string } | { display_name: string }[] | null;
  } | null;
};

function Wishlist() {
  const list = useServerFn(listWishlist);
  const toggle = useServerFn(toggleWishlist);
  const [items, setItems] = useState<Item[] | null>(null);

  const refresh = () => list().then((r) => setItems(r.items as unknown as Item[]));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (wigId: string) => {
    await toggle({ data: { wigId } });
    setItems((it) => it?.filter((i) => i.wig_id !== wigId) ?? null);
  };

  if (!items) {
    return <div className="mx-auto max-w-7xl px-5 py-10"><p className="text-sm text-muted-foreground">Loading wishlist…</p></div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Wishlist</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">Saved looks.</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-sand/40 px-6 py-20 text-center">
          <p className="font-display text-2xl text-mahogany">No saved wigs yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Tap the heart on any wig to save it here.</p>
          <Link to="/app/catalog" className="mt-5 inline-flex rounded-md bg-mahogany px-5 py-2 text-sm text-cream">Browse catalog</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.filter((i) => i.wigs).map((i) => {
            const w = i.wigs!;
            const ret = Array.isArray(w.retailers) ? w.retailers[0] : w.retailers;
            return (
              <div key={i.wig_id} className="group overflow-hidden rounded-lg border border-border bg-card">
                <Link to="/wig/$id" params={{ id: w.id }} className="block">
                  <div className="aspect-[4/5] overflow-hidden bg-sand">
                    <img src={w.images[0]} alt={w.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                </Link>
                <div className="p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-gold-dark">{ret?.display_name ?? ""}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-foreground">{w.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-sm">{formatPrice(Number(w.price), w.currency)}</span>
                    <button onClick={() => remove(i.wig_id)} aria-label="Remove" className="text-mahogany hover:text-mahogany-soft">
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
