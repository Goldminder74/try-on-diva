import { getPaddleEnvironment } from "@/lib/paddle";

export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-gold/20 border-b border-gold/40 px-4 py-2 text-center text-xs font-mono uppercase tracking-wider text-mahogany">
      Test mode — payments in the preview are not real.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Learn more
      </a>
    </div>
  );
}
