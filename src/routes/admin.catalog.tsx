import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminCatalog, setWigPublished, deleteWig } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/catalog")({
  component: CatalogPage,
});

function CatalogPage() {
  const listFn = useServerFn(listAdminCatalog);
  const pubFn = useServerFn(setWigPublished);
  const delFn = useServerFn(deleteWig);
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [published, setPublished] = useState<"any" | "yes" | "no">("any");
  const [featured, setFeatured] = useState<"any" | "yes" | "no">("any");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => listFn({ data: { page, published, featured } }).then(setData).catch(() => setData({ wigs: [], retailers: [], total: 0 }));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [page, published, featured]);

  const onPub = async (w: any) => {
    setBusy(w.id);
    try {
      await pubFn({ data: { id: w.id, published: !w.is_published } });
      toast.success(w.is_published ? "Unpublished" : "Republished");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };
  const onDel = async (w: any) => {
    if (!confirm(`Delete "${w.name}"? This cannot be undone.`)) return;
    setBusy(w.id);
    try {
      await delFn({ data: { id: w.id } });
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(null); }
  };

  const retailerName = (id: string) => data?.retailers?.find((r: any) => r.id === id)?.business_name ?? "-";

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Moderation</p>
          <h1 className="mt-1 font-display text-3xl text-mahogany">Catalog</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select label="Published" value={published} onChange={(v) => { setPage(1); setPublished(v as any); }} options={[["any","All"],["yes","Published"],["no","Unpublished"]]} />
          <Select label="Featured" value={featured} onChange={(v) => { setPage(1); setFeatured(v as any); }} options={[["any","All"],["yes","Featured"],["no","Not featured"]]} />
        </div>
      </div>

      {!data ? <p className="text-sm text-muted-foreground">Loading…</p>
        : data.wigs.length === 0 ? <p className="text-sm text-muted-foreground">No wigs match.</p>
        : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.wigs.map((w: any) => (
                <div key={w.id} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative aspect-[4/5] bg-muted">
                    {w.images?.[0] && <img src={w.images[0]} alt={w.name} className="h-full w-full object-cover" />}
                    {w.is_featured && <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">Featured</span>}
                    {!w.is_published && <span className="absolute right-2 top-2 rounded-full bg-destructive/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-destructive-foreground">Unpublished</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-medium leading-tight">{w.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{retailerName(w.retailer_id)} · {w.currency} {w.price}</p>
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => onPub(w)} disabled={busy === w.id} className="flex-1 rounded-md border border-border px-2 py-1 text-xs hover:border-mahogany disabled:opacity-50">
                        {w.is_published ? "Unpublish" : "Republish"}
                      </button>
                      <button onClick={() => onDel(w)} disabled={busy === w.id} className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">{data.total} total · page {page}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40">Previous</button>
                <button disabled={page * 60 >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}

      <p className="mt-6 text-xs text-muted-foreground">
        Manage featured wigs in <Link to="/admin/featured" className="text-mahogany underline">/admin/featured</Link>.
      </p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5 text-sm">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
