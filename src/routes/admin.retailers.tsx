import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listRetailers, setRetailerActive, extendRetailerTrial } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/retailers")({
  component: RetailersPage,
});

function RetailersPage() {
  const listFn = useServerFn(listRetailers);
  const activeFn = useServerFn(setRetailerActive);
  const trialFn = useServerFn(extendRetailerTrial);
  const [rows, setRows] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => listFn({ data: { search: search || undefined } }).then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const onToggle = async (r: any) => {
    setBusy(r.id);
    try {
      await activeFn({ data: { id: r.id, active: !r.is_active } });
      toast.success(r.is_active ? "Retailer suspended" : "Retailer reactivated");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onExtend = async (r: any) => {
    setBusy(r.id);
    try {
      await trialFn({ data: { id: r.id, days: 30 } });
      toast.success("Trial extended by 30 days");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Moderation</p>
          <h1 className="mt-1 font-display text-3xl text-mahogany">Retailers</h1>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search business name…"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
          />
          <button onClick={reload} className="rounded-md bg-mahogany px-3 py-1.5 text-xs text-cream">Search</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Business</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Trial ends</th>
              <th className="px-4 py-2 font-medium">Wigs</th>
              <th className="px-4 py-2 font-medium">Try-ons 30d</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No retailers.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <div className="font-medium">{r.business_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.slug}</div>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{r.country ?? "—"}</td>
                <td className="px-4 py-2 capitalize">{r.plan}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.trial_ends_at ? new Date(r.trial_ends_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-2 font-mono">{r.wig_count}</td>
                <td className="px-4 py-2 font-mono">{r.try_ons_30d}</td>
                <td className="px-4 py-2">
                  {r.is_active ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Active</span>
                    : <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">Suspended</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => onExtend(r)}
                      disabled={busy === r.id}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:border-mahogany disabled:opacity-50"
                    >+30d trial</button>
                    <button
                      onClick={() => onToggle(r)}
                      disabled={busy === r.id}
                      className={`rounded-md px-2 py-1 text-xs disabled:opacity-50 ${r.is_active ? "border border-destructive/40 text-destructive" : "bg-mahogany text-cream"}`}
                    >{r.is_active ? "Suspend" : "Reactivate"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
