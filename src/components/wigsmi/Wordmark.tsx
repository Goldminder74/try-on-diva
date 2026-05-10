export function Wordmark({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-4xl" };
  return (
    <span className={`wordmark text-mahogany ${sizes[size]} ${className}`}>
      wigsmi<span className="text-gold">.</span>
    </span>
  );
}
