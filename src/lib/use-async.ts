import { useEffect, useState } from "react";
import { type Wig, type WigCardData } from "./wigs";

// Skeleton card so layouts don't jump while data loads.
export function WigCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="shimmer aspect-square w-full rounded-md" />
      <div className="shimmer mt-3 h-3 w-3/4 rounded" />
      <div className="shimmer mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}

declare module "./wigs" {
  // helper alias so callers can use a narrower type if they want
  export type WigCardData = Wig;
}

export function useAsync<T>(fn: () => Promise<T>, deps: ReadonlyArray<unknown> = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e as Error); setLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}
