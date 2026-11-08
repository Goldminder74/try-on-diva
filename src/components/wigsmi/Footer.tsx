import { Link } from "@tanstack/react-router";
import { Facebook, Instagram } from "lucide-react";
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
            <li><Link to="/faq" className="hover:text-mahogany">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gold-dark">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/retailer" className="hover:text-mahogany">For retailers</Link></li>
            <li><a href="/wigsmi-brochure.pdf" download className="hover:text-mahogany">Download brochure (PDF)</a></li>
            <li><Link to="/faq" className="hover:text-mahogany">FAQ</Link></li>
            <li><Link to="/privacy" className="hover:text-mahogany">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-mahogany">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Wigsmi</span>
          <div className="flex items-center gap-2">
            <a href="https://www.facebook.com/profile.php?id=61590950803900" target="_blank" rel="noopener noreferrer" aria-label="Wigsmi on Facebook (opens in a new tab)" title="Wigsmi on Facebook" className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:text-mahogany focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Facebook className="h-5 w-5" aria-hidden="true" /></a>
            <a href="https://www.instagram.com/wigsmi/" target="_blank" rel="noopener noreferrer" aria-label="Wigsmi on Instagram (opens in a new tab)" title="Wigsmi on Instagram" className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:text-mahogany focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Instagram className="h-5 w-5" aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
