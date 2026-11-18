import { Link } from "@tanstack/react-router";
import { Facebook, Instagram } from "lucide-react";
import { Wordmark } from "./Wordmark";

function TikTokMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

const heading = "mb-5 text-[11px] uppercase tracking-[0.35em] text-champagne/50";
const link = "text-sm font-light text-champagne/75 transition-colors hover:text-champagne";
const social =
  "inline-flex items-center gap-2 text-sm font-light text-champagne/75 transition-colors hover:text-champagne focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const SHOP = [
  { to: "/catalog", label: "Collection" },
  { to: "/try-on", label: "Try on" },
  { to: "/pricing", label: "Pricing" },
  { to: "/guides", label: "Journal" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 bg-onyx-soft">
      <div className="mx-auto w-full max-w-7xl px-6 pb-10 pt-20 md:px-12">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          <div className="col-span-2">
            <Wordmark size="lg" />
            <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-champagne/65">
              The try-on atelier. See every wig on your own face before you buy.
            </p>
          </div>
          <div>
            <p className={heading}>The atelier</p>
            <ul className="space-y-3">
              {SHOP.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className={link}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={heading}>Wigsmi</p>
            <ul className="space-y-3">
              <li>
                <Link to="/retailer" className={link}>
                  For retailers
                </Link>
              </li>
              <li>
                <a href="/wigsmi-brochure.pdf" download className={link}>
                  Brochure (PDF)
                </a>
              </li>
              <li>
                <Link to="/privacy" className={link}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className={link}>
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-champagne/10 pt-8 sm:flex-row">
          <span className="text-[11px] uppercase tracking-[0.35em] text-champagne/50">
            © {new Date().getFullYear()} Wigsmi
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="https://www.instagram.com/wigsmi/"
              target="_blank"
              rel="noopener noreferrer"
              className={social}
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
              Instagram
            </a>
            <a
              href="https://www.tiktok.com/@wigsmi"
              target="_blank"
              rel="noopener noreferrer"
              className={social}
            >
              <TikTokMark className="h-4 w-4" />
              TikTok
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61590950803900"
              target="_blank"
              rel="noopener noreferrer"
              className={social}
            >
              <Facebook className="h-4 w-4" aria-hidden="true" />
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
