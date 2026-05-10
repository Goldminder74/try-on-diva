import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyRetailerContext,
  saveRetailerOnboarding,
} from "@/lib/retailer.functions";

export const Route = createFileRoute("/portal/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Wigsmi Retailer" }] }),
  component: Onboarding,
});

type Step = 1 | 2 | 3 | 4 | 5;

interface Form {
  business_name: string;
  display_name: string;
  website: string;
  country: string;
  contact_name: string;
  currency: "GBP" | "USD" | "EUR" | "NGN" | "ZAR" | "CAD";
  brand_primary: string;
  referral_source: string;
}

function Onboarding() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getMyRetailerContext);
  const save = useServerFn(saveRetailerOnboarding);

  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Form>({
    business_name: "",
    display_name: "",
    website: "",
    country: "",
    contact_name: "",
    currency: "GBP",
    brand_primary: "#3D1C02",
    referral_source: "",
  });

  useEffect(() => {
    getCtx().then((ctx) => {
      if (ctx.retailer) {
        setForm((f) => ({
          ...f,
          business_name: ctx.retailer!.business_name ?? "",
          display_name: ctx.retailer!.display_name ?? "",
          website: ctx.retailer!.website ?? "",
          country: ctx.retailer!.country ?? "",
          contact_name: ctx.retailer!.contact_name ?? "",
          currency: (ctx.retailer!.currency as Form["currency"]) ?? "GBP",
          brand_primary: ctx.retailer!.brand_primary ?? "#3D1C02",
        }));
        if (ctx.retailer.onboarding_completed) {
          navigate({ to: "/portal" });
        }
      }
    });
  }, [getCtx, navigate]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onFinish = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await save({ data: form });
      navigate({ to: "/portal" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const canNext: Record<Step, boolean> = {
    1: form.business_name.length >= 2 && form.display_name.length >= 2,
    2: form.website.length === 0 || /^https?:\/\//i.test(form.website),
    3: true,
    4: true,
    5: true,
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
          Step {step} of 5
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-sand/50">
          <div
            className="h-full rounded-full bg-mahogany transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={onFinish} className="space-y-6 rounded-2xl border border-border bg-card p-8">
        {step === 1 && (
          <>
            <Heading
              kicker="Tell us about your business"
              title="Your shop, in your words."
            />
            <Field label="Legal business name">
              <input
                required
                value={form.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                className={inputCls}
                placeholder="e.g. Sienna Hair Co. Ltd"
              />
            </Field>
            <Field label="Display name (shown to shoppers)">
              <input
                required
                value={form.display_name}
                onChange={(e) => set("display_name", e.target.value)}
                className={inputCls}
                placeholder="e.g. Sienna Hair"
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Heading kicker="Online presence" title="Where can shoppers find you?" />
            <Field label="Website URL (optional)">
              <input
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className={inputCls}
                placeholder="https://yourshop.com"
              />
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
                placeholder="e.g. United Kingdom"
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Heading kicker="Pricing" title="What currency do you sell in?" />
            <Field label="Default currency">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Form["currency"])}
                className={inputCls}
              >
                <option value="GBP">GBP — British Pound</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="ZAR">ZAR — South African Rand</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </Field>
            <p className="text-xs text-muted-foreground">
              You can override the currency on individual wigs later.
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <Heading kicker="Brand" title="Add a touch of your brand." />
            <Field label="Primary brand color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brand_primary}
                  onChange={(e) => set("brand_primary", e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border bg-input"
                />
                <input
                  value={form.brand_primary}
                  onChange={(e) => set("brand_primary", e.target.value)}
                  className={inputCls}
                  pattern="^#[0-9a-fA-F]{6}$"
                />
              </div>
            </Field>
            <Field label="Primary contact name (optional)">
              <input
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                className={inputCls}
                placeholder="Who should we reach if needed?"
              />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <Heading
              kicker="Almost done"
              title="One last thing — how did you hear about us?"
            />
            <Field label="Referral source (optional)">
              <select
                value={form.referral_source}
                onChange={(e) => set("referral_source", e.target.value)}
                className={inputCls}
              >
                <option value="">Choose one…</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google search</option>
                <option value="referral">Friend or colleague</option>
                <option value="press">Press / article</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <p className="rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold-dark">
              You're starting a free 3-month trial. No card required. Add up to 30 wigs
              on the Starter plan.
            </p>
          </>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={step === 1 || busy}
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="text-sm text-muted-foreground hover:text-mahogany disabled:opacity-30"
          >
            ← Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              disabled={!canNext[step]}
              onClick={() => setStep((s) => (s + 1) as Step)}
              className="rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50"
            >
              {busy ? "Setting up…" : "Finish & enter dashboard"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
        {kicker}
      </p>
      <h1 className="mt-1 font-display text-3xl text-mahogany">{title}</h1>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-gold-dark">
        {label}
      </span>
      {children}
    </label>
  );
}
