import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { WigCard } from "@/components/wigsmi/WigCard";
import { WigCardSkeleton } from "@/components/wigsmi/WigCardSkeleton";
import { fetchWigs, STYLE_TYPES, HAIR_TEXTURES, type Wig } from "@/lib/wigs";
import { useAsync } from "@/lib/use-async";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Wig Catalog — Wigsmi" },
      { name: "description", content: "Browse hundreds of wigs from trusted Black-owned and Black-focused retailers. Filter by style, texture, length and price." },
      { property: "og:title", content: "Wig Catalog — Wigsmi" },
      { property: "og:description", content: "Browse and try on hundreds of wigs." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const [query, setQuery] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [textures, setTextures] = useState<string[]>([]);
  const [sort, setSort] = useState<"featured" | "newest" | "popular" | "price-asc" | "price-desc">("featured");
  const [showFilters, setShowFilters] = useState(false);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const { data: wigs, loading, error } = useAsync<Wig[]>(() => fetchWigs(), []);

  const filtered = useMemo(() => {
    const source = wigs ?? [];
    let out = source.filter((w: Wig) => {
      if (query && !w.name.toLowerCase().includes(query.toLowerCase()) && !w.retailer.toLowerCase().includes(query.toLowerCase())) return false;
      if (styles.length && !styles.includes(w.style_type)) return false;
      if (textures.length && !textures.includes(w.hair_texture)) return false;
      return true;
    });
    switch (sort) {
      case "newest": out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
      case "popular": out = [...out].sort((a, b) => b.try_on_count - a.try_on_count); break;
      case "price-asc": out = [...out].sort((a, b) => a.price - b.price); break;
      case "price-desc": out = [...out].sort((a, b) => b.price - a.price); break;
      case "featured": out = [...out].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)); break;
    }
    return out;
  }, [query, styles, textures, sort]);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-7xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Catalog</p>
            <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">Find your next look.</h1>
          </div>
          <p className="hidden text-sm text-muted-foreground md:block">{filtered.length} wigs</p>
        </div>

        {/* Search + sort */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or retailer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-input py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20"
            />
          </div>
          <button
            onClick={() => setShowFilters(s => !s)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-mahogany md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:border-mahogany focus:outline-none"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="popular">Most tried-on</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          {/* Filters */}
          <aside className={`${showFilters ? "block" : "hidden"} space-y-7 md:block`}>
            <FilterGroup label="Style">
              {STYLE_TYPES.map(s => (
                <FilterChip key={s} active={styles.includes(s)} onClick={() => setStyles(toggle(styles, s))}>{s}</FilterChip>
              ))}
            </FilterGroup>
            <FilterGroup label="Texture">
              {HAIR_TEXTURES.map(t => (
                <FilterChip key={t} active={textures.includes(t)} onClick={() => setTextures(toggle(textures, t))}>{t}</FilterChip>
              ))}
            </FilterGroup>
            {(styles.length || textures.length || query) ? (
              <button
                onClick={() => { setStyles([]); setTextures([]); setQuery(""); }}
                className="text-sm text-mahogany underline-offset-4 hover:underline"
              >Clear all filters</button>
            ) : null}
          </aside>

          {/* Grid */}
          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-sand/40 px-6 py-20 text-center">
                <p className="font-display text-2xl text-mahogany">No wigs match those filters.</p>
                <p className="mt-2 text-sm text-muted-foreground">Try clearing a filter or two.</p>
                <button onClick={() => { setStyles([]); setTextures([]); setQuery(""); }} className="mt-5 rounded-md bg-mahogany px-5 py-2 text-sm text-cream">Clear filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {filtered.map(w => <WigCard key={w.id} wig={w} />)}
              </div>
            )}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Want personalised picks? <Link to="/try-on" className="text-mahogany underline">Take the style quiz</Link>.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-gold-dark">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-mahogany bg-mahogany text-cream"
          : "border-border bg-card text-foreground hover:border-mahogany"
      }`}
    >
      {children}
    </button>
  );
}
