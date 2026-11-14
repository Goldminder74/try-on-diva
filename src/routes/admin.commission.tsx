import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAllCommissionSales, setCommissionSaleStatus } from "@/lib/commission.functions";

export const Route = createFileRoute("/admin/commission")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Commission - Wigsmi Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminCommission,
});

const money = (n: number) => `£${n.toFixed(2)}`;

/**
 * Wigsmi-side reconciliation: every order a retailer has logged as coming
 * from a tracked visit, and the settle action that closes one out.
 */
function AdminCommission() {
  const load = useServerFn(listAllCommissionSales);
  const setStatus = useServerFn(setCommissionSaleStatus);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof load>>["rows"]>([]);
  const [totals, setTotals] = useState({ owed: 0, settled: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await load();
    setRows(result.rows);
    setTotals(result.totals);
  }, [load]);

  useEffect(() => {
    let on = true;
    load()
      .then((result) => {
        if (!on) return;
        setRows(result.rows);
        setTotals(result.totals);
      })
      .catch(() => toast.error("Couldn't load commission sales"))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [load]);

  const byRetailer = useMemo(() => {
    const map = new Map<string, { owed: number; count: number }>();
    for (const r of rows) {
      if (r.status !== "pending" && r.status !== "confirmed") continue;
      const prev = map.get(r.retailer_name) ?? { owed: 0, count: 0 };
      map.set(r.retailer_name, { owed: prev.owed + r.commission_gbp, count: prev.count + 1 });
    }
    return [...map.entries()].sort((a, b) => b[1].owed - a[1].owed);
  }, [rows]);

  const onSettle = async (saleId: string) => {
    setBusyId(saleId);
    try {
      const result = await setStatus({ data: { saleId, status: "settled" } });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked settled.");
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading commission…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Commission
          </p>
          <h1 className="mt-1 font-display text-4xl text-mahogany">Orders from Wigsmi visits</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">
            Retailers log each order themselves. Check one against the tracked visit and the shop's
            own records, then settle it here.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-md border border-mahogany px-3 py-2 text-xs font-medium text-mahogany hover:bg-mahogany hover:text-cream"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Orders logged", value: String(totals.count) },
          { label: "Owed", value: money(totals.owed) },
          { label: "Settled", value: money(totals.settled) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 font-display text-3xl text-mahogany">{card.value}</p>
          </div>
        ))}
      </section>

      {byRetailer.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="font-display text-lg text-mahogany">Owed by shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            {byRetailer.map(([name, v]) => (
              <li key={name} className="flex items-center justify-between">
                <span className="text-foreground/80">
                  {name} <span className="text-muted-foreground">({v.count})</span>
                </span>
                <span className="font-mono text-mahogany">{money(v.owed)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.retailer_name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.order_reference}
                      {r.wig_name && (
                        <span className="block text-muted-foreground">{r.wig_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{r.sale_date}</TableCell>
                    <TableCell className="text-xs">{money(r.sale_gbp)}</TableCell>
                    <TableCell className="text-xs">
                      {money(r.commission_gbp)}
                      <span className="block text-muted-foreground">
                        {(r.commission_bps / 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{r.status}</TableCell>
                    <TableCell className="text-right">
                      {r.status !== "settled" && r.status !== "void" && (
                        <button
                          onClick={() => onSettle(r.id)}
                          disabled={busyId === r.id}
                          className="rounded bg-mahogany px-2 py-1 text-xs text-cream hover:bg-mahogany-soft disabled:opacity-50"
                        >
                          {busyId === r.id ? "…" : "Mark settled"}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
