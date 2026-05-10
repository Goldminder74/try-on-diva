import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-sand/50">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-10 px-5 py-14 md:grid-cols-4">
        <div className="col-span-2">
          <Wordmark size="lg" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Try every wig before you buy it. Built for Black women. Powered by AI.
          </p>
        </div>
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gold-dark">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-mahogany">Catalog</Link></li>
            <li><Link to="/try-on" className="hover:text-mahogany">Try on</Link></li>
            <li><Link to="/pricing" className="hover:text-mahogany">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gold-dark">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/retailer" className="hover:text-mahogany">For retailers</Link></li>
            <li><a href="#" className="hover:text-mahogany">Privacy</a></li>
            <li><a href="#" className="hover:text-mahogany">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Wigsmi</span>
          <a href="#" className="hover:text-mahogany"><Instagram className="h-4 w-4" /></a>
        </div>
      </div>
    </footer>
  );
}
