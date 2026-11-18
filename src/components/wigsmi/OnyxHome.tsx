import type React from "react";
import { Link } from "@tanstack/react-router";
import hero from "@/assets/onyx-hero.jpg";
import curls from "@/assets/onyx-curls.jpg";
import { Header } from "./Header";
import { Footer } from "./Footer";
const label = "font-manrope text-[11px] uppercase tracking-[0.35em] text-champagne/70";

export function OnyxHome({ notice }: { notice?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-onyx font-manrope text-champagne">
      {notice}
      <Header overlay />

      <section className="relative grid min-h-screen md:grid-cols-2">
        <div className="flex flex-col justify-end px-6 pb-20 pt-32 md:px-12">
          <p className={label}>The try-on atelier</p>
          <h1 className="mt-6 max-w-xl font-couture text-5xl leading-[1.02] md:text-7xl">
            Virtual wig <span className="whitespace-nowrap">try-on</span> for{" "}
            <em className="text-bronze">Black women.</em>
          </h1>
          <p className="mt-8 max-w-md text-base font-light leading-relaxed text-champagne/75">
            Wear it first. See lace fronts, glueless wigs and bobs on your own face before you buy.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/try-on"
              className="border border-bordeaux bg-bordeaux px-9 py-4 text-xs uppercase tracking-[0.3em] transition-opacity hover:opacity-85"
            >
              Begin your try-on
            </Link>
            <Link
              to="/catalog"
              className="border border-champagne/40 px-9 py-4 text-xs uppercase tracking-[0.3em] transition-colors hover:border-champagne"
            >
              The collection
            </Link>
            <Link
              to="/auth/signup"
              className="border border-champagne/40 px-9 py-4 text-xs uppercase tracking-[0.3em] transition-colors hover:border-champagne"
            >
              Create a free account
            </Link>
          </div>
        </div>
        <img
          src={hero}
          alt="Woman wearing a long sleek black wig"
          width={1280}
          height={1600}
          className="h-full max-h-screen min-h-[70vh] w-full object-cover object-[65%_20%]"
        />
      </section>

      <section className="border-y border-champagne/10 px-6 py-24 text-center md:px-12">
        <p className={label}>The ritual</p>
        <h2 className="mt-6 font-couture text-4xl md:text-5xl">Try on a wig in three steps</h2>
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
        <img
          src={curls}
          alt="Woman in profile with honey bronze curly wig"
          width={1024}
          height={1280}
          loading="lazy"
          className="w-full object-cover"
        />
        <div className="px-6 py-20 md:px-16">
          <p className={label}>Featured</p>
          <h2 className="mt-6 font-couture text-5xl leading-tight md:text-6xl">
            Honey <em className="text-bronze">bronze</em> curls
          </h2>
          <p className="mt-6 max-w-sm font-light text-champagne/70">
            Warm tones that glow against deep skin. Try it on in the atelier.
          </p>
          <Link
            to="/catalog"
            className="group mt-10 inline-block text-xs uppercase tracking-[0.3em]"
          >
            Discover
            <span className="mt-2 block h-px w-10 bg-bronze transition-all duration-500 group-hover:w-full" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
