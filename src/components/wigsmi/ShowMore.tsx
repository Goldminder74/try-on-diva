import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 24;

/** Number of items to show; resets to one page whenever `resetKey` changes. */
export function useVisibleCount(resetKey: string, step = PAGE_SIZE, initial = step) {
  const [count, setCount] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    // Keep the initial count on first render; reset when filters change.
    if (first.current) {
      first.current = false;
      return;
    }
    setCount(step);
  }, [resetKey, step]);
  return { count, more: () => setCount((c) => c + step) };
}

export function ShowMore({
  shown,
  total,
  onMore,
}: {
  shown: number;
  total: number;
  onMore: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">
        Showing {Math.min(shown, total)} of {total} wigs
      </p>
      {shown < total && (
        <Button variant="outline" onClick={onMore}>
          Show more wigs
        </Button>
      )}
    </div>
  );
}
