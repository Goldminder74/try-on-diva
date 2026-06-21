import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import { WigTryOnEngine } from "@/components/try-on/WigTryOnEngine";
import { TryOnResultActions } from "@/components/try-on/TryOnResultActions";
import { fetchFeaturedWigs, type Wig } from "@/lib/wigs";
import { useServerFn } from "@tanstack/react-start";
import { getTryOnQuota } from "@/lib/try-on.functions";
import { Link } from "@tanstack/react-router";
// Apply-wig generation logic lives in a hook outside this Lovable-managed file.
import { useApplyWig } from "@/hooks/useApplyWig";

export const Route = createFileRoute("/_authenticated/app/try-on")({
  validateSearch: (s: Record<string, unknown>) => ({
    wig: typeof s.wig === "string" ? s.wig : undefined,
  }),
  head: () => ({ meta: [{ title: "Try on — Wigsmi" }] }),
  component: AppTryOn,
});


function AppTryOn() {
  const search = Route.useSearch();
  const [list, setList] = useState<Wig[]>([]);
  const [wig, setWig] = useState<Wig | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number | null; isPaid: boolean } | null>(null);

  // Apply-wig flow (gate + selfie conversion + generateTryOn) lives in the hook.
  const { applying, error: applyError, resultUrl, blocked, remaining, applyWig, reset: resetApply } =
    useApplyWig(wig, photo);

  const fetchQuota = useServerFn(getTryOnQuota);


  useEffect(() => {
    fetchFeaturedWigs(9).then((items) => {
      setList(items);
      const initial = (search.wig && items.find((w) => w.id === search.wig)) || items[0] || null;
      setWig(initial);
    });
    fetchQuota({ data: {} }).then((q) => setQuota({ remaining: q.remaining, isPaid: q.isPaid }));
  }, [fetchQuota, search.wig]);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setError("File too large — max 10MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Use JPEG, PNG or WebP.");
    setError(null);
    resetApply();
    setPhoto(f);
  };


  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Try on</p>
          <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">See it on you.</h1>
        </div>
        {quota && !quota.isPaid && (
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-gold-dark">{(remaining ?? quota.remaining) ?? 0}</span> free try-ons left this month
          </p>
        )}
      </div>

      {blocked && (
        <div className="mt-6 rounded-xl border border-gold/30 bg-gold/10 p-5">
          <p className="font-display text-2xl text-mahogany">You've used your 5 free try-ons this month.</p>
          <p className="mt-2 text-sm text-foreground/80">Upgrade to Plus for unlimited try-ons and HD downloads.</p>
          <Link to="/pricing" className="mt-4 inline-flex rounded-md bg-mahogany px-4 py-2 text-sm text-cream">See plans</Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {resultUrl ? (
            <>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <img src={resultUrl} alt="Your try-on result" className="w-full object-contain" />
              </div>
              <TryOnResultActions resultUrl={resultUrl} wigName={wig?.name} />
            </>
          ) : (
            <WigTryOnEngine photo={photo} wig={wig} skinTone={4} />
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-md border border-mahogany bg-transparent px-4 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {photo ? "Change photo" : "Upload selfie"}
            </button>
            {(photo || resultUrl) && (
              <button
                onClick={() => { setPhoto(null); setError(null); resetApply(); }}
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-mahogany disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </button>
            )}
            <button
              onClick={() => applyWig()}
              disabled={!wig || blocked || applying}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream disabled:opacity-50"
            >
              {applying ? (<><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>) : "Apply wig"}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          {(error || applyError) && <p className="mt-3 text-sm text-error">{error || applyError}</p>}
        </div>

        <aside>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gold-dark">Choose a wig</p>
          <div className="grid grid-cols-3 gap-3">
            {list.map((w) => (
              <button
                key={w.id}
                onClick={() => setWig(w)}
                className={`group overflow-hidden rounded-md border-2 text-left transition-all ${wig?.id === w.id ? "border-gold" : "border-transparent hover:border-mahogany/40"}`}
              >
                <img src={w.images[0]} alt={w.name} className="aspect-square w-full object-cover" />
                <p className="line-clamp-1 px-1 py-1.5 text-[11px]">{w.name}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>

    </div>
  );
}
