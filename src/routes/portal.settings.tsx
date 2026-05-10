import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRetailerContext, updateRetailer } from "@/lib/retailer.functions";

export const Route = createFileRoute("/portal/settings")({
  head: () => ({ meta: [{ title: "Settings — Wigsmi Retailer" }] }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const getCtx = useServerFn(getMyRetailerContext);
  const save = useServerFn(updateRetailer);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    display_name: "",
    business_name: "",
    website: "",
    country: "",
    contact_name: "",
    currency: "GBP",
    brand_primary: "#3D1C02",
    widget_cta_text: "Try it on with Wigsmi",
  });

  useEffect(() => {
    getCtx().then((ctx) => {
      if (!ctx.retailer) {
        navigate({ to: "/portal/onboarding" });
        return;
      }
      setForm({
        display_name: ctx.retailer.display_name ?? "",
        business_name: ctx.retailer.business_name ?? "",
        website: ctx.retailer.website ?? "",
        country: ctx.retailer.country ?? "",
        contact_name: ctx.retailer.contact_name ?? "",
        currency: ctx.retailer.currency ?? "GBP",
        brand_primary: ctx.retailer.brand_primary ?? "#3D1C02",
        widget_cta_text: ctx.retailer.widget_cta_text ?? "Try it on with Wigsmi",
      });
    });
  }, [getCtx, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await save({
        data: {
          display_name: form.display_name,
          business_name: form.business_name,
          website: form.website || null,
          country: form.country || null,
          contact_name: form.contact_name || null,
          currency: form.currency,
          brand_primary: form.brand_primary,
          widget_cta_text: form.widget_cta_text,
        },
      });
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
        Settings
      </p>
      <h1 className="mt-1 font-display text-4xl text-mahogany">Retailer settings.</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <Section title="Business">
          <Field label="Display name">
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Legal business name">
            <input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Country">
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Contact name">
            <input
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Branding">
          <Field label="Primary color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_primary}
                onChange={(e) => setForm({ ...form, brand_primary: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded-md border border-border bg-input"
              />
              <input
                value={form.brand_primary}
                onChange={(e) => setForm({ ...form, brand_primary: e.target.value })}
                pattern="^#[0-9a-fA-F]{6}$"
                className={inputCls}
              />
            </div>
          </Field>
          <Field label="Widget button text">
            <input
              value={form.widget_cta_text}
              onChange={(e) => setForm({ ...form, widget_cta_text: e.target.value })}
              className={inputCls}
              maxLength={60}
            />
          </Field>
          <Field label="Default currency">
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className={inputCls}
            >
              {["GBP", "USD", "EUR", "NGN", "ZAR", "CAD"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        {error && <p className="text-sm text-error">{error}</p>}
        {msg && <p className="text-sm text-gold-dark">{msg}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg text-mahogany">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20";

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
