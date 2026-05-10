export function WigCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="shimmer aspect-square w-full rounded-md" />
      <div className="shimmer mt-3 h-3 w-3/4 rounded" />
      <div className="shimmer mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}
