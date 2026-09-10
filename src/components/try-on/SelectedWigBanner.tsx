import type { Wig } from "@/lib/wigs";

/**
 * Shows the style the shopper is trying on, with the retailer's own product
 * photo. Before a result it confirms the choice made in the catalogue; after a
 * result it lets her compare the generated look against the real product.
 */
export function SelectedWigBanner({
  wig,
  hasResult = false,
  hasPhoto = false,
}: {
  wig: Wig | null;
  hasResult?: boolean;
  hasPhoto?: boolean;
}) {
  if (!wig) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <img
        src={wig.images[0]}
        alt={wig.name}
        className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-wider text-gold-dark">
          {hasResult ? "The style you're wearing" : "Style selected"}
        </p>
        <p className="font-display text-lg leading-tight text-mahogany break-words">{wig.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hasResult
            ? "Compare your result with the product photo."
            : hasPhoto
              ? "Creating your try-on…"
              : "Upload a selfie and we'll put it on you."}
        </p>
      </div>
    </div>
  );
}

export default SelectedWigBanner;
