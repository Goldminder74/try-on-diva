import { useEffect, useState } from "react";

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

export function WigCardSkeleton() {
  return null; // see src/components/wigsmi/WigCardSkeleton.tsx
}
