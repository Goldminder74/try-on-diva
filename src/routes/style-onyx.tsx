import { createFileRoute, Link } from "@tanstack/react-router";
import hero from "@/assets/onyx-hero.jpg";
import curls from "@/assets/onyx-curls.jpg";

export const Route = createFileRoute("/style-onyx")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Onyx Couture style sample | Wigsmi" },
      { name: "description", content: "A private design sample of the Onyx Couture look for Wigsmi." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Onyx Couture style sample | Wigsmi" },
      { property: "og:description", content: "A private design sample for Wigsmi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Manrope:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  component: OnyxSample,
});

const label = "font-manrope text-[11px] uppercase tracking-[0.35em] text-champagne/70";

function OnyxSample() {
  return (
    <div className="min-h-screen bg-onyx font-manrope text-champagne">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-couture text-2xl tracking-[0.2em]">WIGSMI</span>
        <nav className="hidden gap-10 md:flex">
          {["Collection", "Try on", "Journal", "Retailers"].map((n) => (
            <span key={n} className={`${label} cursor-pointer transition-colors hover:text-champagne`}>{n}</span>
          ))}
        </nav>
        <span className={label}>Sign in</span>
      </header>

      <section className="relative grid min-h-screen md:grid-cols-2">
        <div className="flex flex-col justify-end px-6 pb-20 pt-32 md:px-12">
          <p className={label}>The try-on atelier</p>
          <h1 className="mt-6 font-couture text-6xl leading-[0.95] md:text-8xl">
            Wear it<br /><em className="text-bronze">first.</em>
          </h1>
          <p className="mt-8 max-w-sm text-base font-light leading-relaxed text-champagne/75">
            See every lace front, glueless unit and bob on your own face before you buy. Made for
            the women who set the standard.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/try-on" className="border border-bordeaux bg-bordeaux px-9 py-4 text-xs uppercase tracking-[0.3em] transition-opacity hover:opacity-85">
              Begin your try-on
            </Link>
            <Link to="/catalog" className="border border-champagne/40 px-9 py-4 text-xs uppercase tracking-[0.3em] transition-colors hover:border-champagne">
              The collection
            </Link>
          </div>
        </div>
        <img src={hero} alt="Woman wearing a long sleek black wig" width={1280} height={1600} className="h-full max-h-screen min-h-[70vh] w-full object-cover object-[65%_20%]" />
      </section>

      <section className="border-y border-champagne/10 px-6 py-24 text-center md:px-12">
        <p className={label}>The ritual</p>
        <div className="mx-auto mt-14 grid max-w-5xl gap-14 md:grid-cols-3">
          {[
            ["I", "Your portrait", "One selfie, kept private to you."],
            ["II", "Your style", "Choose from our retail partners' finest units."],
            ["III", "Your reveal", "See it on you, in seconds, before you spend."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span className="font-couture text-3xl italic text-bronze">{n}</span>
              <h3 className="mt-4 font-couture text-2xl">{t}</h3>
              <p className="mt-3 text-sm font-light text-champagne/65">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-center md:grid-cols-2">
        <img src={curls} alt="Woman in profile with honey bronze curly wig" width={1024} height={1280} loading="lazy" className="w-full object-cover" />
        <div className="px-6 py-20 md:px-16">
          <p className={label}>Featured</p>
          <h2 className="mt-6 font-couture text-5xl leading-tight md:text-6xl">
            Honey <em className="text-bronze">bronze</em> curls
          </h2>
          <p className="mt-6 max-w-sm font-light text-champagne/70">
            Warm tones that glow against deep skin. Try it on in the atelier.
          </p>
          <Link to="/catalog" className="group mt-10 inline-block text-xs uppercase tracking-[0.3em]">
            Discover
            <span className="mt-2 block h-px w-10 bg-bronze transition-all duration-500 group-hover:w-full" />
          </Link>
        </div>
      </section>

      <footer className="bg-onyx-soft px-6 py-16 text-center md:px-12">
        <span className="font-couture text-3xl tracking-[0.2em]">WIGSMI</span>
        <p className={`${label} mt-6`}>Design sample only. Your live site is unchanged.</p>
      </footer>
    </div>
  );
}
