import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Percent, RefreshCw, Share2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMyCommission,
  logCommissionSale,
  saveCommissionSettings,
  setCommissionSaleStatus,
  type CommissionOverview,
} from "@/lib/commission.functions";
import { listMyWigs } from "@/lib/retailer.functions";
import { COMMISSION_MAX_BPS, COMMISSION_MIN_BPS, commissionFor } from "@/lib/commission";

export const Route = createFileRoute("/portal/commission")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Commission - Wigsmi Retailer Portal" },
      { name: "description", content: "See the visits Wigsmi sends to your shop and the commission owed on orders that come from them." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalCommission,
});

const money = (n: number) => `£${n.toFixed(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

function PortalCommission() {
  const load = useServerFn(getMyCommission);
  const save = useServerFn(saveCommissionSettings);
  const log = useServerFn(logCommissionSale);
  const setStatus = useServerFn(setCommissionSaleStatus);
  const myWigs = useServerFn(listMyWigs);

  const [data, setData] = useState<CommissionOverview | null>(null);
  const [wigs, setWigs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(false);

  // Settings draft.
  const [enabled, setEnabled] = useState(false);
  const [rateBps, setRateBps] = useState(1000);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Sale form.
  const [orderReference, setOrderReference] = useState("");
  const [saleGbp, setSaleGbp] = useState("");
  const [wigId, setWigId] = useState("none");
  const [clickToken, setClickToken] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    const result = await load();
    setData(result);
    if (result.retailer) {
      setEnabled(result.retailer.commission_enabled);
      setRateBps(result.retailer.commission_rate_bps || 1000);
      setAcceptTerms(!!result.retailer.commission_terms_accepted_at);
    }
  }, [load]);

  useEffect(() => {
    let on = true;
    Promise.all([
      load(),
      myWigs().then((r) =>
        (r.wigs ?? []).map((w: any) => ({ id: w.id, name: w.name })),
      ),
    ])
      .then(([result, list]) => {
        if (!on) return;
        setData(result);
        setWigs(list);
        if (result.retailer) {
          setEnabled(result.retailer.commission_enabled);
          setRateBps(result.retailer.commission_rate_bps || 1000);
          setAcceptTerms(!!result.retailer.commission_terms_accepted_at);
        }
      })
      .catch(() => toast.error("Couldn't load your commission page"))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [load, myWigs]);

  const previewCommission = useMemo(() => {
    const amount = Number(saleGbp);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return commissionFor(amount, rateBps);
  }, [saleGbp, rateBps]);

  const onSave = async () => {
    setSaving(true);
    try {
      const result = await save({ data: { enabled, rateBps, acceptTerms } });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(enabled ? "Commission is on." : "Commission is off.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  const onLog = async () => {
    const amount = Number(saleGbp);
    if (!orderReference.trim()) {
      toast.error("Add the order reference from your shop.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Add the order total in pounds.");
      return;
    }
    setLogging(true);
    try {
      const result = await log({
        data: {
          orderReference: orderReference.trim(),
          saleGbp: amount,
          wigId: wigId === "none" ? undefined : wigId,
          clickToken: clickToken.trim() || undefined,
          saleDate,
          notes: notes.trim() || undefined,
        },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Logged - ${money(commissionFor(amount, rateBps))} commission.`);
      setOrderReference("");
      setSaleGbp("");
      setClickToken("");
      setNotes("");
      setWigId("none");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't log this sale");
    } finally {
      setLogging(false);
    }
  };

  const onStatus = async (saleId: string, status: "confirmed" | "void" | "settled") => {
    const result = await setStatus({ data: { saleId, status } });
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Updated.");
    await refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading commission…
      </div>
    );
  }

  if (!data?.retailer) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-3xl text-mahogany">No retailer account yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Commission is set up per shop. Create your retailer account first.
        </p>
        <Link
          to="/retailer/signup"
          className="mt-5 inline-flex rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
        >
          Set up your shop
        </Link>
      </div>
    );
  }

  const { totals, sales, clicks, retailer } = data;

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Commission
        </p>
        <h1 className="mt-1 font-display text-4xl text-mahogany">
          Visits we send you
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/80">
          When a shopper clicks "Buy from {retailer.website ?? "your shop"}" on a
          Wigsmi listing, we send them to your product page with a Wigsmi reference
          code. If they order, you tell us and we add commission at the rate you
          agreed. Nothing is charged automatically - you log each order yourself.
        </p>
      </header>

      {/* Settings */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl text-mahogany">Turn commission on</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {retailer.website
                ? `Tracked links point at ${retailer.website}.`
                : "Add your shop's website in Settings before turning this on."}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Commission" />
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="rate" className="text-sm font-medium text-mahogany">
              Commission rate
            </Label>
            <span className="font-mono text-lg text-mahogany">
              {(rateBps / 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            id="rate"
            className="mt-3"
            min={COMMISSION_MIN_BPS}
            max={COMMISSION_MAX_BPS}
            step={50}
            value={[rateBps]}
            onValueChange={([v]) => setRateBps(v)}
            disabled={!enabled}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {money(100)} order → {money(commissionFor(100, rateBps))} to Wigsmi ·{" "}
            {money(250)} order → {money(commissionFor(250, rateBps))}.
          </p>
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm">
          <Checkbox
            checked={acceptTerms}
            onCheckedChange={(v) => setAcceptTerms(v === true)}
            disabled={!enabled}
          />
          <span className="text-foreground/80">
            I agree to log orders that came from a tracked Wigsmi visit and pay the
            rate above on them.{" "}
            <Link to="/terms" className="text-mahogany underline">
              Read the terms
            </Link>
            .
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={refresh} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </section>

      {/* Totals */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tracked visits (30 days)", value: String(totals.clicks30d), icon: Share2 },
          { label: "Orders logged", value: String(totals.salesLogged), icon: Store },
          { label: "Commission owed", value: money(totals.commissionOwed), icon: Percent },
          { label: "Settled", value: money(totals.commissionSettled), icon: Percent },
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

      {/* Log a sale */}
      {enabled && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="font-display text-xl text-mahogany">Log an order</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the order once your shop confirms it. The reference code is the
            <code className="mx-1 rounded bg-sand px-1 py-0.5 font-mono text-xs">wigsmi_ref</code>
            value on the link the shopper arrived on.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="order-ref">Order reference</Label>
              <Input
                id="order-ref"
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                placeholder="e.g. 1042"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="order-total">Order total (£)</Label>
              <Input
                id="order-total"
                type="number"
                min="0.01"
                step="0.01"
                value={saleGbp}
                onChange={(e) => setSaleGbp(e.target.value)}
                placeholder="189.00"
              />
              {previewCommission !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Commission: {money(previewCommission)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="wig">Which wig (optional)</Label>
              <Select value={wigId} onValueChange={setWigId}>
                <SelectTrigger id="wig">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {wigs.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ref-code">Wigsmi reference code (optional)</Label>
              <Input
                id="ref-code"
                value={clickToken}
                onChange={(e) => setClickToken(e.target.value)}
                placeholder="paste the wigsmi_ref value"
                maxLength={64}
              />
            </div>
            <div>
              <Label htmlFor="sale-date">Order date</Label>
              <Input
                id="sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="anything we should know"
                maxLength={500}
              />
            </div>
          </div>

          <Button className="mt-5" onClick={onLog} disabled={logging}>
            {logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log this order
          </Button>
        </section>
      )}

      {/* Sales */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="font-display text-xl text-mahogany">Logged orders</p>
        {sales.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing logged yet. Orders you add here appear in this list.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      {s.order_reference}
                      {s.wig_name && (
                        <span className="block text-muted-foreground">{s.wig_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.sale_date}</TableCell>
                    <TableCell className="text-xs">{money(s.sale_gbp)}</TableCell>
                    <TableCell className="text-xs">{money(s.commission_gbp)}</TableCell>
                    <TableCell className="text-xs capitalize">{s.status}</TableCell>
                    <TableCell className="text-right">
                      {s.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onStatus(s.id, "confirmed")}
                            className="rounded border border-mahogany px-2 py-1 text-xs text-mahogany hover:bg-mahogany hover:text-cream"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => onStatus(s.id, "void")}
                            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-sand"
                          >
                            Void
                          </button>
                        </div>
                      )}
                      {s.status === "confirmed" && data.isAdmin && (
                        <button
                          onClick={() => onStatus(s.id, "settled")}
                          className="rounded bg-mahogany px-2 py-1 text-xs text-cream hover:bg-mahogany-soft"
                        >
                          Mark settled
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

      {/* Tracked visits */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <p className="font-display text-xl text-mahogany">Recent tracked visits</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Each code below was handed to your shop with the shopper. Match it to an
          order when you log one.
        </p>
        {clicks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No tracked visits yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {clicks.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-sand/40 px-4 py-2.5 text-xs"
              >
                <span className="font-mono text-mahogany">{c.token}</span>
                <span className="text-muted-foreground">
                  {c.wig_name ? `${c.wig_name} · ` : ""}
                  {new Date(c.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
