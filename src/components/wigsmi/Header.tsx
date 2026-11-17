import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/catalog", label: "Catalogue" },
  { to: "/try-on", label: "Try on" },
  { to: "/pricing", label: "Pricing" },
  { to: "/guides", label: "Guides" },
  { to: "/retailer", label: "For retailers" },
] as const;

export function Header() {
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
    <header className="sticky top-0 z-40 border-b border-border bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center">
          <Wordmark size="md" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/catalog" className="text-sm text-foreground/80 hover:text-mahogany">
            Catalogue
          </Link>
          <Link to="/try-on" className="text-sm text-foreground/80 hover:text-mahogany">
            Try on
          </Link>
          <Link to="/pricing" className="text-sm text-foreground/80 hover:text-mahogany">
            Pricing
          </Link>
          <Link to="/guides" className="text-sm text-foreground/80 hover:text-mahogany">
            Guides
          </Link>
          <Link to="/retailer" className="text-sm text-foreground/80 hover:text-mahogany">
            For retailers
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            isRetailer ? (
              <Link
                to="/portal"
                className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
              >
                Retailer Portal
              </Link>
            ) : (
              <Link
                to="/app"
                className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
              >
                My Wigsmi
              </Link>
            )
          ) : (
            <>
              <Link
                to="/auth/login"
                className="hidden rounded-md border border-mahogany px-4 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/try-on"
                className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
              >
                Try free
              </Link>
            </>
          )}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-mahogany md:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-cream">
              <SheetTitle className="font-display text-2xl text-mahogany">Menu</SheetTitle>
              <nav className="mt-8 flex flex-col">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-border py-4 text-base text-mahogany"
                  >
                    {n.label}
                  </Link>
                ))}
                {!user && (
                  <Link
                    to="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="py-4 text-base text-gold-dark"
                  >
                    Log in
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
