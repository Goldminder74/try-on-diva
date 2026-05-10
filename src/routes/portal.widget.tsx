import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyWidget,
  createMyWidget,
  updateMyWidget,
  rotateMyWidgetToken,
} from "@/lib/retailer.functions";
import { Copy, Check, RefreshCw, AlertTriangle, X } from "lucide-react";

export const Route = createFileRoute("/portal/widget")({
  head: () => ({ meta: [{ title: "Widget — Wigsmi Retailer" }] }),
  component: WidgetPage,
});

type WidgetRow = {
  id: string;
  embed_token: string;
  widget_type: string;
  is_active: boolean;
  allowed_domains: string[];
  config: { accent_color?: string } | null;
};

function WidgetPage() {
  const get = useServerFn(getMyWidget);
  const create = useServerFn(createMyWidget);
  const update = useServerFn(updateMyWidget);
  const rotate = useServerFn(rotateMyWidgetToken);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [widget, setWidget] = useState<WidgetRow | null>(null);
  const [retailerBrand, setRetailerBrand] = useState("#3D1C02");

  // form state
  const [widgetType, setWidgetType] = useState<"full" | "button">("full");
  const [isActive, setIsActive] = useState(true);
  const [ctaText, setCtaText] = useState("Try it on with Wigsmi");
  const [accent, setAccent] = useState("#3D1C02");
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");

  const refresh = async () => {
    const r = await get();
    if (r.widget) {
      const w = r.widget as WidgetRow;
      setWidget(w);
      setWidgetType((w.widget_type as "full" | "button") || "full");
      setIsActive(w.is_active);
      setDomains(w.allowed_domains || []);
      setAccent(
        w.config?.accent_color || r.retailer?.brand_primary || "#3D1C02",
      );
    } else {
      setWidget(null);
    }
    if (r.retailer) {
      setRetailerBrand(r.retailer.brand_primary || "#3D1C02");
      setCtaText(r.retailer.widget_cta_text || "Try it on with Wigsmi");
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await create();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create widget.");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await update({
        data: {
          widget_type: widgetType,
          is_active: isActive,
          allowed_domains: domains,
          accent_color: accent,
          cta_text: ctaText,
        },
      });
      await refresh();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const onRotate = async () => {
    if (
      !confirm(
        "Rotate the embed token? Your current snippet will stop working until you paste the new one.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await rotate();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rotate token.");
    } finally {
      setBusy(false);
    }
  };

  const addDomain = () => {
    const d = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!d) return;
    if (domains.includes(d)) {
      setNewDomain("");
      return;
    }
    setDomains([...domains, d]);
    setNewDomain("");
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Loading widget…
      </div>
    );
  }

  if (!widget) {
    return (
      <div>
        <Header />
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <h2 className="font-display text-2xl text-mahogany">
            Create your widget
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Generate an embed token, configure how it appears, and copy a
            single line of HTML into your store.
          </p>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create my widget"}
          </button>
        </div>
      </div>
    );
  }

  const previewSrc = `/embed/widget/${widget.embed_token}`;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://wigsmi.app";
  const snippet = `<script async src="${origin}/embed/widget.js" data-wigsmi-token="${widget.embed_token}"></script>\n<div data-wigsmi-widget></div>`;

  return (
    <div>
      <Header />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* LEFT: Config */}
        <form
          onSubmit={onSave}
          className="space-y-6 rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-mahogany">Configuration</h2>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>

          <Field label="Widget type">
            <div className="grid grid-cols-2 gap-2">
              {(["full", "button"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setWidgetType(t)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    widgetType === t
                      ? "border-mahogany bg-mahogany/5 text-mahogany"
                      : "border-border text-foreground hover:border-mahogany/50"
                  }`}
                >
                  <span className="block font-medium">
                    {t === "full" ? "Full gallery" : "Button only"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t === "full"
                      ? "Gallery + try-on launcher"
                      : "Single CTA button"}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Call-to-action text">
            <input
              value={ctaText}
              maxLength={60}
              onChange={(e) => setCtaText(e.target.value)}
              className={inputCls}
              placeholder="Try it on with Wigsmi"
            />
          </Field>

          <Field label="Accent color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-md border border-border bg-input"
              />
              <input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className={inputCls}
                pattern="^#[0-9a-fA-F]{6}$"
              />
              {accent !== retailerBrand && (
                <button
                  type="button"
                  onClick={() => setAccent(retailerBrand)}
                  className="text-xs text-muted-foreground hover:text-mahogany"
                >
                  Reset
                </button>
              )}
            </div>
          </Field>

          <Field label="Allowed domains">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {domains.length === 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] text-gold-dark">
                    <AlertTriangle className="h-3 w-3" /> Any domain allowed
                  </span>
                )}
                {domains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => setDomains(domains.filter((x) => x !== d))}
                      className="text-muted-foreground hover:text-error"
                      aria-label={`Remove ${d}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDomain();
                    }
                  }}
                  className={inputCls}
                  placeholder="yourshop.com"
                />
                <button
                  type="button"
                  onClick={addDomain}
                  className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:border-mahogany"
                >
                  Add
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Restrict where the widget can load. Leave empty to allow any
                domain (not recommended for production).
              </p>
            </div>
          </Field>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-4">
            {savedAt > 0 && Date.now() - savedAt < 3000 ? (
              <p className="text-xs text-success">Saved.</p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-mahogany px-5 py-2 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        {/* RIGHT: Install */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl text-mahogany">Install</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste this anywhere on your store — product pages, home page, or
              a dedicated try-on page. Works with Shopify, WooCommerce, and
              static HTML.
            </p>

            <div className="mt-4">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-gold-dark">
                Embed snippet
              </p>
              <pre className="overflow-x-auto rounded-md border border-border bg-mahogany/5 p-3 font-mono text-[11px] leading-relaxed text-foreground">
{snippet}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-mahogany px-3 py-1.5 text-xs text-cream hover:bg-mahogany-soft"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy snippet
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-1.5 font-mono the-[11px] text-[11px] uppercase tracking-wider text-gold-dark">
                Embed token
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-input px-2.5 py-1.5 font-mono text-[11px]">
                  {widget.embed_token}
                </code>
                <button
                  type="button"
                  onClick={onRotate}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] hover:border-error hover:text-error disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" /> Rotate
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Rotating invalidates the current snippet. Update your store
                with the new one immediately.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl text-mahogany">Live preview</h2>
              <Link
                to="/portal/catalog"
                className="text-xs text-muted-foreground hover:text-mahogany"
              >
                Manage wigs →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-cream">
              <iframe
                key={widget.embed_token}
                src={previewSrc}
                title="Widget preview"
                className="h-[560px] w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
          Widget
        </p>
        <h1 className="mt-1 font-display text-4xl text-mahogany">
          Embed Wigsmi on your store.
        </h1>
      </div>
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
