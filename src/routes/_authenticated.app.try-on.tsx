import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, RefreshCw } from "lucide-react";
import { WigTryOnEngine } from "@/components/try-on/WigTryOnEngine";
import { SelectedWigBanner } from "@/components/try-on/SelectedWigBanner";
import { TryOnResultActions } from "@/components/try-on/TryOnResultActions";
import { fetchFeaturedWigs, fetchWigById, type Wig } from "@/lib/wigs";

import { useServerFn } from "@tanstack/react-start";
import { getTryOnQuota } from "@/lib/try-on.functions";
import { Link } from "@tanstack/react-router";
// Apply-wig generation logic lives in a hook outside this Lovable-managed file.
import { useApplyWig, type TryOnView } from "@/hooks/useApplyWig";

export const Route = createFileRoute("/_authenticated/app/try-on")({
  validateSearch: (s: Record<string, unknown>) => ({
    wig: typeof s.wig === "string" ? s.wig : undefined,
  }),
  head: () => ({ meta: [{ title: "Try on - Wigsmi" }] }),
  component: AppTryOn,
});


function AppTryOn() {
  const search = Route.useSearch();
  const [list, setList] = useState<Wig[]>([]);
  const [wig, setWig] = useState<Wig | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [pendingAuto, setPendingAuto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number | null; isPaid: boolean } | null>(null);

  // Apply-wig flow (gate + selfie conversion + generateTryOn) lives in the hook.
  const {
    applying,
    error: applyError,
    resultUrl,
    views,
    blocked,
    remaining,
    applyWig,
    reset: resetApply,
  } = useApplyWig(wig, photo);

  // Which camera angle is on screen. Side and back are generated on request.
  const [activeView, setActiveView] = useState<TryOnView>("front");
  useEffect(() => {
    if (!resultUrl) setActiveView("front");
  }, [resultUrl]);
  const shownUrl = views[activeView] ?? resultUrl;

  const fetchQuota = useServerFn(getTryOnQuota);


  useEffect(() => {
    fetchFeaturedWigs(9).then(async (items) => {
      setList(items);
      // No default hair selection. Only select a wig when the URL explicitly
      // names one; otherwise the user must tap a style deliberately.
      if (!search.wig) {
        setWig(null);
        return;
      }
      const inList = items.find((w) => w.id === search.wig) ?? null;
      if (inList) {
        setWig(inList);
        return;
      }
      // Arrived from the catalogue with a style outside this shortlist: fetch
      // it so it is already selected, waiting only for a selfie.
      const fetched = await fetchWigById(search.wig);
      if (fetched) {
        setWig(fetched);
        setList((prev) => (prev.some((p) => p.id === fetched.id) ? prev : [fetched, ...prev]));
      }
    });
    fetchQuota({ data: {} }).then((q) => setQuota({ remaining: q.remaining, isPaid: q.isPaid }));
  }, [fetchQuota, search.wig]);


  // Choosing a style. When a selfie is already uploaded, this is the trigger
  // that starts generation.
  const onSelectWig = (w: Wig) => {
    setWig(w);
    resetApply();
    if (photo && !applying) setPendingAuto(true);
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setError("File too large - max 10MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Use JPEG, PNG or WebP.");
    setError(null);
    resetApply();
    setPhoto(f);
    // Uploading a selfie starts the try-on immediately, but only when a wig has
    // already been deliberately selected. If no wig is chosen yet, generation
    // waits for the user's hair selection.
    setPendingAuto(true);
  };

  // Kick off generation as soon as both a selfie and a deliberately chosen wig
  // are in state.
  useEffect(() => {
    if (!pendingAuto || !photo || !wig || applying || blocked) return;
    setPendingAuto(false);
    void applyWig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAuto, photo, wig, applying, blocked]);


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
          <p className="font-display text-2xl text-mahogany">You've used your 3 free try-ons this month.</p>
          <p className="mt-2 text-sm text-foreground/80">Upgrade to Plus for unlimited try-ons and HD downloads.</p>
          <Link to="/pricing" className="mt-4 inline-flex rounded-md bg-mahogany px-4 py-2 text-sm text-cream">See plans</Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {resultUrl ? (
            <>
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                {shownUrl ? (
                  <img
                    src={shownUrl}
                    alt={`Your try-on result, ${activeView} view`}
                    className="w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 text-mahogany">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <p className="font-display text-lg">
                      Creating the {activeView} view…
                    </p>
                  </div>
                )}
              </div>

              {/* All three angles come back together as one try-on. */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["front", "side", "back"] as TryOnView[]).map((v) => {
                  const ready = Boolean(views[v]);
                  return (
                    <button
                      key={v}
                      onClick={() => setActiveView(v)}
                      disabled={!ready}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:opacity-40 ${
                        activeView === v
                          ? "border-gold bg-gold text-mahogany"
                          : "border-border bg-card text-mahogany hover:border-mahogany"
                      }`}
                    >
                      {v} view
                    </button>
                  );
                })}
                <span className="text-xs text-muted-foreground">
                  Front, side and back, all in one try-on.
                </span>
              </div>

              {shownUrl && <TryOnResultActions resultUrl={shownUrl} wigName={wig?.name} />}
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
                onClick={() => onSelectWig(w)}
                className={`group overflow-hidden rounded-md border-2 text-left transition-all ${wig?.id === w.id ? "border-gold" : "border-transparent hover:border-mahogany/40"}`}
              >
                <img src={w.images[0]} alt={w.name} className="aspect-square w-full object-cover" />
                <p className="px-1 py-1.5 text-[11px] leading-tight break-words">{w.name}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>

    </div>
  );
}
