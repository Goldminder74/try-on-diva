import { Link } from "@tanstack/react-router";
import { Wordmark } from "./Wordmark";
import { useAuth } from "@/contexts/auth-context";

export function Header() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center">
          <Wordmark size="md" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/catalog" className="text-sm text-foreground/80 hover:text-mahogany">Catalog</Link>
          <Link to="/try-on" className="text-sm text-foreground/80 hover:text-mahogany">Try on</Link>
          <Link to="/pricing" className="text-sm text-foreground/80 hover:text-mahogany">Pricing</Link>
          <Link to="/retailer" className="text-sm text-foreground/80 hover:text-mahogany">For retailers</Link>
        </nav>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <Link
              to="/app"
              className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
            >
              My Wigsmi
            </Link>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="hidden rounded-md border border-mahogany px-4 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/auth/signup"
                className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream shadow-sm hover:bg-mahogany-soft"
              >
                Try free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
