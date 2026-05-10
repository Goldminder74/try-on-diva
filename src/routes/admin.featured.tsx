import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFeaturedWigs, setFeaturedWigs, searchPublishedWigs } from "@/lib/admin.functions";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/featured")({
  component: FeaturedPage,
});

function FeaturedPage() {
  const getFn = useServerFn(getFeaturedWigs);
  const saveFn = useServerFn(setFeaturedWigs);
  const searchFn = useServerFn(searchPublishedWigs);
  const [wigs, setWigs] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [picker, setPicker] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn({}).then((r) => { setWigs(r.wigs); setRetailers(r.retailers); }).catch(() => {});
  }, [getFn]);

  useEffect(() => { if (picker) searchFn({ data: { q } }).then(setResults); }, [picker, q, searchFn]);

  const retailerName = (id: string) => retailers.find((r) => r.id === id)?.business_name ?? "—";

  const move = (i: number, dir: -1 | 1) => {
    const next = [...wigs];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setWigs(next);
  };
  const remove = (i: number) => setWigs(wigs.filter((_, idx) => idx !== i));
  const add = (w: any) => {
    if (wigs.length >= 5) return toast.error("Maximum 5 featured wigs.");
    if (wigs.find((x) => x.id === w.id)) return;
    setWigs([...wigs, w]);
    setPicker(false);
    if (!retailers.find((r) => r.id === w.retailer_id)) {
      // best-effort: leave retailer name blank until next reload
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { ids: wigs.map((w) => w.id) } });
      toast.success("Featured wigs updated");
      const r = await getFn({});
      setWigs(r.wigs);
      setRetailers(r.retailers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Curation</p>
          <h1 className="mt-1 font-display text-3xl text-mahogany">Featured wigs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Up to 5 wigs shown on the consumer home and landing page.</p>
        </div>
        <button onClick={save} disabled={saving} className="rounded-md bg-mahogany px-4 py-2 text-sm text-cream disabled:opacity-50">
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>

      <div className="space-y-3">
        {wigs.map((w, i) => (
          <div key={w.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
            <div className="font-mono text-xs text-muted-foreground w-6 text-center">#{i + 1}</div>
            <div className="h-16 w-16 overflow-hidden rounded-md bg-muted">
              {w.images?.[0] && <img src={w.images[0]} alt={w.name} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{w.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{retailerName(w.retailer_id)}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md border border-border p-1.5 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === wigs.length - 1} className="rounded-md border border-border p-1.5 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(i)} className="rounded-md border border-destructive/40 p-1.5 text-destructive"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {wigs.length < 5 && (
          <button
            onClick={() => setPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground hover:border-mahogany hover:text-mahogany"
          >
            <Plus className="h-4 w-4" /> Add featured wig
          </button>
        )}
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPicker(false)}>
          <div className="w-full max-w-xl rounded-xl border border-border bg-cream p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-display text-lg text-mahogany">Pick a wig</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="mb-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {results.map((w) => (
                <button key={w.id} onClick={() => add(w)} className="flex w-full items-center gap-3 rounded-md border border-border p-2 text-left hover:border-mahogany">
                  <div className="h-12 w-12 overflow-hidden rounded bg-muted">
                    {w.images?.[0] && <img src={w.images[0]} alt={w.name} className="h-full w-full object-cover" />}
                  </div>
                  <span className="text-sm">{w.name}</span>
                </button>
              ))}
              {results.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
