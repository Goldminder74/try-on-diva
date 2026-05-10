import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { type Wig, formatPrice } from "@/lib/wigs";
import { useAuth } from "@/contexts/auth-context";
import { toggleWishlist } from "@/lib/wishlist.functions";

export function WigCard({ wig, savedInitial = false }: { wig: Wig; savedInitial?: boolean }) {
  const { user } = useAuth();
  const toggle = useServerFn(toggleWishlist);
  const [saved, setSaved] = useState(savedInitial);

  const onHeart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }
    setSaved((s) => !s);
    try {
      const res = await toggle({ data: { wigId: wig.id } });
      setSaved(res.saved);
    } catch {
      setSaved((s) => !s);
    }
  };

  return (
    <Link
      to="/wig/$id"
      params={{ id: wig.id }}
      className="card-hover group block rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-sand">
        <img
          src={wig.images[0]}
          alt={wig.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          onClick={onHeart}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 text-mahogany shadow-sm hover:bg-cream"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>
        <div className="absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="block w-full rounded-md bg-mahogany py-2 text-center text-xs font-medium text-cream">
            Try it on
          </span>
        </div>
        {wig.try_on_count > 1000 && (
          <span className="absolute left-2 top-2 rounded-sm bg-gold px-1.5 py-0.5 font-mono text-[10px] font-medium text-mahogany">
            {wig.try_on_count.toLocaleString()} try-ons
          </span>
        )}
      </div>
      <div className="pt-3">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">{wig.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{wig.retailer}</p>
        <p className="mt-1 text-sm font-mono text-mahogany">{formatPrice(wig.price, wig.currency)}</p>
      </div>
    </Link>
  );
}
