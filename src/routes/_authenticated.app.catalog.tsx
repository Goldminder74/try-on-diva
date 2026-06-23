import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { WigCard } from "@/components/wigsmi/WigCard";
import { WigCardSkeleton } from "@/components/wigsmi/WigCardSkeleton";
import { fetchWigs, STYLE_TYPES, HAIR_TEXTURES, type Wig } from "@/lib/wigs";
import { useAsync } from "@/lib/use-async";

export const Route = createFileRoute("/_authenticated/app/catalog")({
  head: () => ({ meta: [{ title: "Catalog - Wigsmi" }] }),
  component: AppCatalog,
});

function AppCatalog() {
  const [query, setQuery] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [textures, setTextures] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const { data: wigs, loading } = useAsync<Wig[]>(() => fetchWigs(), []);
  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const filtered = useMemo(() => {
    return (wigs ?? []).filter((w) => {
      if (query && !w.name.toLowerCase().includes(query.toLowerCase()) && !w.retailer.toLowerCase().includes(query.toLowerCase())) return false;
      if (styles.length && !styles.includes(w.style_type)) return false;
      if (textures.length && !textures.includes(w.hair_texture)) return false;
      return true;
    });
  }, [wigs, query, styles, textures]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Catalog</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">Browse every wig.</h1>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or retailer"
            className="w-full rounded-md border border-border bg-input py-2.5 pl-10 pr-4 text-sm focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20"
          />
        </div>
        <button onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm md:hidden">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <aside className={`${show ? "block" : "hidden"} md:block space-y-7`}>
          <Group label="Style">
            {STYLE_TYPES.map((s) => (
              <Chip key={s} active={styles.includes(s)} onClick={() => setStyles(toggle(styles, s))}>{s}</Chip>
            ))}
          </Group>
          <Group label="Texture">
            {HAIR_TEXTURES.map((t) => (
              <Chip key={t} active={textures.includes(t)} onClick={() => setTextures(toggle(textures, t))}>{t}</Chip>
            ))}
          </Group>
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <WigCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-sand/40 px-6 py-20 text-center">
              <p className="font-display text-2xl text-mahogany">Nothing matches.</p>
              <Link to="/app/catalog" onClick={() => { setStyles([]); setTextures([]); setQuery(""); }} className="mt-4 inline-flex text-sm text-mahogany underline">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {filtered.map((w) => <WigCard key={w.id} wig={w} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-gold-dark">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs ${active ? "border-mahogany bg-mahogany text-cream" : "border-border bg-card hover:border-mahogany"}`}>{children}</button>
  );
}
