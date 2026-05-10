import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, X } from "lucide-react";
import {
  getMyWig,
  saveMyWig,
  deleteMyWig,
  getMyRetailerContext,
} from "@/lib/retailer.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

type Params = { wigId: string };

export const Route = createFileRoute("/portal/catalog/$wigId")({
  head: () => ({ meta: [{ title: "Edit wig — Wigsmi Retailer" }] }),
  component: WigEditor,
});

const STYLES = ["wig", "bundle", "frontal", "closure", "ponytail", "braid"];
const TEXTURES = ["straight", "wavy", "curly", "kinky", "coily"];
const LENGTHS = ["short", "medium", "long", "extra-long"];
const ORIGINS = ["human", "synthetic", "blend"];

function WigEditor() {
  const params = Route.useParams() as Params;
  const isNew = params.wigId === "new";
  const nav = useNavigate();
  const { user } = useAuth();

  const get = useServerFn(getMyWig);
  const save = useServerFn(saveMyWig);
  const remove = useServerFn(deleteMyWig);
  const getCtx = useServerFn(getMyRetailerContext);

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    currency: "GBP",
    style_type: "wig",
    hair_texture: "wavy",
    hair_origin: "human",
    hair_length: "long",
    colors: [] as string[],
    images: [] as string[],
    product_url: "",
    in_stock: true,
    is_published: false,
    is_featured: false,
  });
  const [colorDraft, setColorDraft] = useState("");

  useEffect(() => {
    (async () => {
      const ctx = await getCtx();
      if (!ctx.retailer || !ctx.retailer.onboarding_completed) {
        nav({ to: "/portal/onboarding" });
        return;
      }
      setForm((f) => ({ ...f, currency: ctx.retailer!.currency || "GBP" }));
      if (!isNew) {
        const r = await get({ data: { id: params.wigId } });
        const w = r.wig;
        setForm({
          name: w.name,
          description: w.description ?? "",
          price: Number(w.price),
          currency: w.currency,
          style_type: w.style_type,
          hair_texture: w.hair_texture,
          hair_origin: w.hair_origin ?? "human",
          hair_length: w.hair_length ?? "long",
          colors: w.colors ?? [],
          images: w.images ?? [],
          product_url: w.product_url ?? "",
          in_stock: w.in_stock,
          is_published: w.is_published,
          is_featured: w.is_featured,
        });
      }
    })().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [get, getCtx, isNew, params.wigId, nav]);

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/wigs/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("wig-images")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("wig-images").getPublicUrl(path);
      setForm((f) => ({ ...f, images: [...f.images, data.publicUrl] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await save({
        data: {
          ...form,
          id: isNew ? undefined : params.wigId,
          product_url: form.product_url || undefined,
        },
      });
      nav({ to: "/portal/catalog" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this wig? This cannot be undone.")) return;
    setBusy(true);
    try {
      await remove({ data: { id: params.wigId } });
      nav({ to: "/portal/catalog" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
            <Link to="/portal/catalog" className="hover:text-mahogany">
              ← Catalog
            </Link>
          </p>
          <h1 className="mt-1 font-display text-4xl text-mahogany">
            {isNew ? "Add a wig" : "Edit wig"}
          </h1>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-error/30 px-3 py-1.5 text-xs text-error hover:bg-error/5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title="Basics">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="Amara Body Wave 22&quot;"
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
                placeholder="Tell shoppers what makes this wig special."
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="Currency">
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
            </div>
            <Field label="Product URL on your store (optional)">
              <input
                type="url"
                value={form.product_url}
                onChange={(e) => setForm({ ...form, product_url: e.target.value })}
                className={inputCls}
                placeholder="https://yourshop.com/products/..."
              />
            </Field>
          </Section>

          <Section title="Attributes">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Style">
                <select
                  value={form.style_type}
                  onChange={(e) => setForm({ ...form, style_type: e.target.value })}
                  className={inputCls}
                >
                  {STYLES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Texture">
                <select
                  value={form.hair_texture}
                  onChange={(e) => setForm({ ...form, hair_texture: e.target.value })}
                  className={inputCls}
                >
                  {TEXTURES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Length">
                <select
                  value={form.hair_length}
                  onChange={(e) => setForm({ ...form, hair_length: e.target.value })}
                  className={inputCls}
                >
                  {LENGTHS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Origin">
                <select
                  value={form.hair_origin}
                  onChange={(e) => setForm({ ...form, hair_origin: e.target.value })}
                  className={inputCls}
                >
                  {ORIGINS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Colors">
              <div className="flex flex-wrap gap-2">
                {form.colors.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-xs"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          colors: form.colors.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={colorDraft}
                  onChange={(e) => setColorDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = colorDraft.trim();
                      if (v && !form.colors.includes(v)) {
                        setForm({ ...form, colors: [...form.colors, v] });
                        setColorDraft("");
                      }
                    }
                  }}
                  placeholder="Type a color, press Enter"
                  className={`${inputCls} flex-1 min-w-[160px]`}
                />
              </div>
            </Field>
          </Section>

          <Section title="Images">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
              {form.images.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-md border border-border bg-sand"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        images: form.images.filter((_, j) => j !== i),
                      })
                    }
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-mahogany hover:text-mahogany disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add image"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Visibility">
            <Toggle
              checked={form.is_published}
              onChange={(v) => setForm({ ...form, is_published: v })}
              label="Published"
              hint="Visible to shoppers in the catalog."
            />
            <Toggle
              checked={form.in_stock}
              onChange={(v) => setForm({ ...form, in_stock: v })}
              label="In stock"
              hint="Shoppers can still try it on when off."
            />
            <Toggle
              checked={form.is_featured}
              onChange={(v) => setForm({ ...form, is_featured: v })}
              label="Featured"
              hint="Boost on the home feed."
            />
          </Section>

          {error && (
            <p className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-mahogany px-5 py-3 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            {busy ? "Saving…" : isNew ? "Create wig" : "Save changes"}
          </button>
        </div>
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

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-mahogany" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-cream transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
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
