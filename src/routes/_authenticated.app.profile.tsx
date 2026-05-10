import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyConsumerProfile, updateProfile } from "@/lib/consumer-profile.functions";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({ meta: [{ title: "Profile — Wigsmi" }] }),
  component: Profile,
});

function Profile() {
  const { user, signOut } = useAuth();
  const get = useServerFn(getMyConsumerProfile);
  const save = useServerFn(updateProfile);
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get().then((r) => {
      setDisplayName(r.profile?.display_name ?? "");
      setCountry(r.profile?.country ?? "");
      setAvatar(r.profile?.avatar_url ?? null);
    });
  }, [get]);

  const onAvatar = async (f: File | undefined) => {
    if (!f || !user) return;
    if (f.size > 5 * 1024 * 1024) return setError("Avatar must be under 5MB.");
    setBusy(true);
    setError(null);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("user-photos").upload(path, f, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("user-photos").createSignedUrl
        ? await supabase.storage.from("user-photos").createSignedUrl(path, 60 * 60 * 24 * 365)
        : { data: null };
      const url = data?.signedUrl ?? null;
      setAvatar(url);
      if (url) await save({ data: { avatar_url: url } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await save({ data: { display_name: displayName, country: country || null } });
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Profile</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany">Your account.</h1>

      <div className="mt-8 flex items-center gap-5">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-mahogany text-cream">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl">
              {(displayName || user?.email || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-mahogany bg-transparent px-4 py-2 text-sm text-mahogany hover:bg-mahogany hover:text-cream"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => onAvatar(e.target.files?.[0])}
          />
          <p className="mt-1 text-xs text-muted-foreground">JPEG/PNG/WebP, up to 5MB.</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <Field label="Display name">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email">
          <input value={user?.email ?? ""} disabled className={`${inputCls} opacity-60`} />
        </Field>
        <Field label="Country">
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United Kingdom" className={inputCls} />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}
        {msg && <p className="text-sm text-gold-dark">{msg}</p>}

        <div className="flex items-center justify-between pt-2">
          <button onClick={onSave} disabled={busy} className="rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button onClick={async () => { await signOut(); nav({ to: "/" }); }} className="text-sm text-muted-foreground hover:text-mahogany">
            Sign out
          </button>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <Link
            to="/app/subscription"
            className="inline-flex items-center gap-1 text-sm font-medium text-mahogany underline-offset-4 hover:underline"
          >
            View subscription & usage →
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-gold-dark">{label}</span>
      {children}
    </label>
  );
}
