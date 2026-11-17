/** The WIGSMI wordmark: Bodoni capitals, set wide, in champagne. */
export function Wordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  return (
    <span className={`wordmark text-mahogany ${sizes[size]} ${className}`} aria-label="Wigsmi">
      Wigsmi
    </span>
  );
}
