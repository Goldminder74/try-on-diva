import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/catalog", label: "Collection" },
  { to: "/try-on", label: "Try on" },
  { to: "/pricing", label: "Pricing" },
  { to: "/guides", label: "Journal" },
  { to: "/retailer", label: "Retailers" },
] as const;

// Onyx Couture navigation label: small capitals, set wide.
const navLabel =
  "text-[11px] uppercase tracking-[0.35em] text-foreground/70 transition-colors hover:text-foreground";
const primaryButton =
  "inline-flex items-center border border-bordeaux bg-bordeaux px-5 py-2.5 text-[11px] uppercase tracking-[0.3em] text-champagne transition-opacity hover:opacity-85";
const outlineButton =
  "inline-flex items-center border border-champagne/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.3em] text-champagne transition-colors hover:border-champagne";

/**
 * The site header. `overlay` lays it over a full-bleed hero (the home page)
 * instead of sitting in its own bar.
 */
export function Header({ overlay = false }: { overlay?: boolean } = {}) {
  const { user, loading } = useAuth();
  const [isRetailer, setIsRetailer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsRetailer(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setIsRetailer((data ?? []).some((r) => r.role === "retailer" || r.role === "admin"));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-40"
          : "sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur-md"
      }
    >
      <div
        className={`mx-auto flex w-full items-center justify-between px-6 md:px-12 ${
          overlay ? "py-6" : "h-16 max-w-7xl md:h-20"
        }`}
      >
        <Link to="/" className="flex items-center" aria-label="Wigsmi home">
          <Wordmark size="md" />
        </Link>
        <nav className="hidden items-center gap-10 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={navLabel}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          {user && !loading ? (
            <Link to={isRetailer ? "/portal" : "/app"} className={outlineButton}>
              {isRetailer ? "Retailer portal" : "My Wigsmi"}
            </Link>
          ) : (
            <>
              <Link to="/auth/login" className={`${navLabel} hidden sm:inline`}>
                Sign in
              </Link>
              <Link to="/try-on" className={primaryButton}>
                Try free
              </Link>
            </>
          )}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center border border-champagne/30 text-champagne lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-l border-border bg-cream">
              <SheetTitle className="wordmark text-2xl text-mahogany">Wigsmi</SheetTitle>
              <nav className="mt-10 flex flex-col">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-border py-5 font-display text-2xl text-mahogany"
                  >
                    {n.label}
                  </Link>
                ))}
                {!user && (
                  <Link
                    to="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="py-5 text-[11px] uppercase tracking-[0.35em] text-gold"
                  >
                    Sign in
                  </Link>
                )}
                {!user && (
                  <Link
                    to="/try-on"
                    onClick={() => setMenuOpen(false)}
                    className={`${primaryButton} mt-4 justify-center`}
                  >
                    Try free
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
