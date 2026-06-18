import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useServerFn } from "@tanstack/react-start";
import {
  createPortalSession,
  listInvoices,
} from "@/lib/subscription.functions";
import { Loader2, ExternalLink, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { RetailerPlanCards } from "@/components/retailer/RetailerPlanCards";
import type { RetailerPlanId } from "@/lib/retailer-plans";

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  currency: string;
  total: number;
  billedAt: string | null;
  invoiceUrl: string | null;
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amountMinor / 100);
}

export const Route = createFileRoute("/portal/billing")({
  component: BillingPage,
});

interface CurrentSub {
  plan: string;
  status: string;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
  billing_interval: string | null;
}

const PAID_PLAN_IDS: RetailerPlanId[] = ["starter", "growth", "scale"];

function BillingPage() {
  const { user } = useAuth();
  const portal = useServerFn(createPortalSession);
  const invoicesFn = useServerFn(listInvoices);
  const [sub, setSub] = useState<CurrentSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  const refetch = () => {
    if (!user) return;
    const env = getPaddleEnvironment();
    supabase
      .from("subscriptions")
      .select("plan, status, paddle_subscription_id, current_period_end, billing_interval")
      .eq("user_id", user.id)
      .eq("customer_type", "retailer")
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSub((data as CurrentSub | null) ?? null));
  };

  useEffect(() => {
    refetch();
    if (!user) return;
    const channel = supabase
      .channel(`retailer-subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    invoicesFn({ data: { environment: getPaddleEnvironment() } })
      .then(setInvoices)
      .catch(() => setInvoices([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sub?.paddle_subscription_id]);

  const isPaidActive =
    !!sub &&
    ["active", "trialing", "past_due"].includes(sub.status) &&
    PAID_PLAN_IDS.includes(sub.plan as RetailerPlanId);

  const currentPlanId = isPaidActive ? (sub!.plan as RetailerPlanId) : null;

  const onManage = async () => {
    setBusy("portal");
    try {
      const { url } = await portal({ data: { environment: getPaddleEnvironment() } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't open portal");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Billing</p>
        <h1 className="mt-1 font-display text-3xl text-mahogany">
          {isPaidActive ? "Your plan" : "Subscribe to a plan"}
        </h1>
        {isPaidActive ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Current plan: <span className="font-medium capitalize text-foreground">{currentPlanId}</span>
              {sub?.billing_interval === "year" && <span className="capitalize text-foreground"> · Yearly</span>}
              {sub?.billing_interval === "month" && <span className="capitalize text-foreground"> · Monthly</span>}
              {sub?.status && (
                <>
                  {" "}· Status: <span className="capitalize">{sub.status}</span>
                </>
              )}
            </p>
            {sub?.status === "past_due" && (
              <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                Your last payment failed. Please update your card to keep your account active.
              </div>
            )}
            <button
              onClick={onManage}
              disabled={busy === "portal"}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-mahogany px-3 py-1.5 text-xs text-mahogany hover:bg-mahogany hover:text-cream disabled:opacity-50"
            >
              {busy === "portal" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Manage subscription
            </button>
          </>
        ) : (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            You don't have an active subscription yet. Pick a plan below to
            keep your wigs published and your widget live after your trial
            ends. <Sparkles className="inline h-3.5 w-3.5 text-gold" />
          </p>
        )}
      </div>

      <RetailerPlanCards currentPlanId={currentPlanId} />

      {invoices && invoices.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-xl text-mahogany">Invoices</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      {inv.billedAt ? new Date(inv.billedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-2 font-mono">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">{inv.status}</td>
                    <td className="px-4 py-2 text-right">
                      {inv.invoiceUrl ? (
                        <a href={inv.invoiceUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-mahogany underline">
                          <FileText className="h-3.5 w-3.5" /> PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">VAT included where applicable.</p>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Need a custom plan?{" "}
        <Link to="/retailer" className="text-mahogany underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
