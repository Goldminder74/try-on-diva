import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, RefreshCw, Sparkles } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { WigTryOnEngine } from "@/components/try-on/WigTryOnEngine";
import {
  fetchFeaturedWigs,
  fetchRetailerBySlug,
  fetchWigsByRetailerId,
  type Wig,
} from "@/lib/wigs";
import { getPublicWidgetData } from "@/lib/widget-public.functions";
import {
  generateAnonymousTryOn,
  getAnonymousTryOnStatus,
} from "@/lib/try-on.functions";
import {
  getOrCreateDeviceId,
  computeFingerprint,
} from "@/lib/anon-fingerprint";
import { blobToBase64 } from "@/hooks/useApplyWig";
import { useAuth } from "@/contexts/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Search = { wig?: string; widget?: string; r?: string };

export const Route = createFileRoute("/try-on")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    wig: typeof s.wig === "string" ? s.wig : undefined,
    widget: typeof s.widget === "string" ? s.widget : undefined,
    r: typeof s.r === "string" ? s.r : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Try a wig on — Wigsmi" },
      { name: "description", content: "Upload a selfie and see any wig on your skin in seconds. Free to try, no account needed." },
      { property: "og:title", content: "Try a wig on — Wigsmi" },
      { property: "og:description", content: "Free virtual wig try-on built for Black women." },
    ],
  }),
  component: TryOn,
});

type RetailerScope = {
  id: string;
  display_name: string;
  logo_url: string | null;
  brand_primary: string | null;
};

function TryOn() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fetchWidget = useServerFn(getPublicWidgetData);
  const runAnonGenerate = useServerFn(generateAnonymousTryOn);
  const fetchAnonStatus = useServerFn(getAnonymousTryOnStatus);

  const [list, setList] = useState<Wig[]>([]);
  const [retailerScope, setRetailerScope] = useState<RetailerScope | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Anonymous one-free-try-on state.
  const [anonReady, setAnonReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [anonUsed, setAnonUsed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Two prompts: (a) post-result "create account" prompt, (b) hard wall on second try.
  const [postPromptOpen, setPostPromptOpen] = useState(false);
  const [wallPromptOpen, setWallPromptOpen] = useState(false);

  const scoped = Boolean(search.widget || search.r) && !showAll;

  // Resolve deviceId + fingerprint + existing anon usage once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = getOrCreateDeviceId();
      const fp = await computeFingerprint();
      if (cancelled) return;
      setDeviceId(id);
      setFingerprint(fp);
      try {
        const status = await fetchAnonStatus({
          data: { deviceId: id, fingerprintHash: fp },
        });
        if (!cancelled) setAnonUsed(Boolean(status?.used));
      } catch {
        /* non-fatal — apply will revalidate server-side */
      }
      if (!cancelled) setAnonReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAnonStatus]);

  // After a result is generated, give the user a moment to enjoy it.
  // Open the soft prompt after 4s OR on the first meaningful interaction.
  useEffect(() => {
    if (!resultUrl || user) return;
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      setPostPromptOpen(true);
    };
    const timer = window.setTimeout(open, 4000);
    const onScroll = () => open();
    const onClick = () => open();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, { capture: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick, { capture: true } as any);
    };
  }, [resultUrl, user]);


  // Load catalogue based on URL scope (widget token, retailer slug, or full).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (search.widget && !showAll) {
        try {
          const data = await fetchWidget({ data: { token: search.widget } });
          if (cancelled) return;
          if ("ok" in data && data.retailer) {
            setRetailerScope({
              id: data.retailer.id,
              display_name: data.retailer.display_name,
              logo_url: data.retailer.logo_url,
              brand_primary: data.retailer.brand_primary ?? null,
            });
            setList(data.wigs as unknown as Wig[]);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      if (search.r && !showAll) {
        const retailer = await fetchRetailerBySlug(search.r);
        if (cancelled) return;
        if (retailer) {
          setRetailerScope({
            id: retailer.id,
            display_name: retailer.display_name,
            logo_url: retailer.logo_url,
            brand_primary: retailer.brand_primary,
          });
          const wigs = await fetchWigsByRetailerId(retailer.id, 24);
          if (!cancelled) setList(wigs);
          return;
        }
      }

      setRetailerScope(null);
      const wigs = await fetchFeaturedWigs(9);
      if (!cancelled) setList(wigs);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [search.widget, search.r, showAll, fetchWidget]);

  const initialWigId = search.wig;
  const desiredWig = useMemo(() => {
    if (list.length === 0) return null;
    return (initialWigId && list.find((w) => w.id === initialWigId)) || list[0];
  }, [list, initialWigId]);

  useEffect(() => {
    if (desiredWig && (!wig || !list.some((w) => w.id === wig.id))) {
      setWig(desiredWig);
    }
  }, [desiredWig, wig, list]);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("File too large — max 10MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { setError("Use JPEG, PNG or WebP."); return; }
    setError(null);
    setResultUrl(null);
    setPhoto(f);
  };

  const runAnonymousTryOn = async () => {
    if (!wig?.images?.[0]) { setError("This wig has no product image."); return; }
    if (!photo) { setError("Upload a selfie first."); return; }
    setError(null);
    setApplying(true);
    try {
      const userPhotoBase64 = await blobToBase64(photo);
      const wigImageUrl = new URL(wig.images[0], window.location.origin).href;
      const out = await runAnonGenerate({
        data: {
          deviceId,
          fingerprintHash: fingerprint,
          userPhotoBase64,
          userPhotoMimeType: photo.type as "image/jpeg" | "image/png" | "image/webp",
          wigId: wig.id,
          wigImageUrl,
          wigName: wig.name,
          wigStyleType: wig.style_type || "wig",
          wigColour: wig.colors?.[0] || "natural",
        },
      });
      if (out.alreadyUsed) {
        setAnonUsed(true);
        setWallPromptOpen(true);
        return;
      }
      setResultUrl(out.signedUrl);
      setAnonUsed(true);
      // Don't open the prompt immediately — let the user see their result first.
      // The prompt is opened by a 4s timer or any user interaction (see effect below).
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try-on generation failed.");
    } finally {
      setApplying(false);
    }
  };

  const onApply = async () => {
    if (!wig) { setError("Pick a wig first."); return; }
    if (!photo) { setError("Upload a selfie first."); return; }
    setError(null);
    if (authLoading) return;

    // Signed-in users: existing authenticated flow unchanged.
    if (user) {
      navigate({ to: "/app/try-on", search: { wig: wig.id } });
      return;
    }

    // Anonymous users:
    if (!anonReady) return; // still resolving fingerprint
    if (anonUsed) {
      setWallPromptOpen(true);
      return;
    }
    await runAnonymousTryOn();
  };

  // Preserve wig + scope across the auth round-trip.
  const redirectTarget = (() => {
    const params = new URLSearchParams();
    if (wig) params.set("wig", wig.id);
    if (search.widget) params.set("widget", search.widget);
    if (search.r) params.set("r", search.r);
    const qs = params.toString();
    return qs ? `/try-on?${qs}` : "/try-on";
  })();

  const accent = retailerScope?.brand_primary || undefined;

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        {scoped && retailerScope && (
          <div
            className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            style={accent ? { borderColor: `${accent}33` } : undefined}
          >
            <div className="flex items-center gap-3">
              {retailerScope.logo_url && (
                <img
                  src={retailerScope.logo_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-gold-dark">
                  Try on by
                </p>
                <p className="font-display text-lg text-mahogany">
                  {retailerScope.display_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAll(true)}
              className="text-xs underline-offset-4 hover:underline text-foreground/70"
            >
              Browse all styles on Wigsmi
            </button>
          </div>
        )}

        {!scoped && (search.widget || search.r) && (
          <div className="mb-6">
            <button
              onClick={() => setShowAll(false)}
              className="text-xs text-mahogany underline-offset-4 hover:underline"
            >
              ← Back to the retailer's styles
            </button>
          </div>
        )}

        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Free try-on</p>
          <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">See it on you.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tip: results improve with bright, even lighting and a clear front-facing selfie.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {resultUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-card">
                <img src={resultUrl} alt="Your try-on result" className="w-full object-contain" />
                {!user && (
                  <div className="border-t border-gold/30 bg-gold/10 p-4">
                    <p className="font-display text-lg text-mahogany">
                      Love what you see?
                    </p>
                    <p className="mt-1 text-sm text-foreground/80">
                      Create a free account for 5 try-ons every month. No card needed.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          navigate({ to: "/auth/signup", search: { redirect: redirectTarget } })
                        }
                        className="rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream hover:bg-mahogany-soft"
                      >
                        Create free account
                      </button>
                      <button
                        onClick={() => setPostPromptOpen(false)}
                        className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-mahogany"
                      >
                        Maybe later
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  onClick={() => { setPhoto(null); setResultUrl(null); setError(null); }}
                  disabled={applying}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-mahogany disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" /> Reset
                </button>
              )}
              <button
                onClick={onApply}
                disabled={!wig || applying}
                className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream disabled:opacity-50"
                style={accent && scoped ? { backgroundColor: accent, color: "#fff" } : undefined}
              >
                {applying ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Apply wig</>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            {error && <p className="mt-3 text-sm text-error">{error}</p>}
          </div>

          <aside>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
                {scoped && retailerScope ? `${retailerScope.display_name} styles` : "Choose a wig"}
              </p>
              {scoped && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11px] text-foreground/60 hover:text-mahogany underline-offset-4 hover:underline"
                >
                  Show all
                </button>
              )}
              {!scoped && (search.widget || search.r) && (
                <button
                  onClick={() => setShowAll(false)}
                  className="text-[11px] text-foreground/60 hover:text-mahogany underline-offset-4 hover:underline"
                >
                  Back to retailer
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <p className="rounded-md border border-border bg-card p-4 text-xs text-muted-foreground">
                No published styles yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {list.map((w: Wig) => (
                  <button
                    key={w.id}
                    onClick={() => { setWig(w); setResultUrl(null); }}
                    className={`group overflow-hidden rounded-md border-2 text-left transition-all ${
                      wig?.id === w.id ? "border-gold" : "border-transparent hover:border-mahogany/40"
                    }`}
                  >
                    <img src={w.images[0]} alt={w.name} className="aspect-square w-full object-cover" />
                    <div className="px-1 py-1.5">
                      <p className="text-[11px] leading-tight text-foreground">{w.name}</p>
                      {!scoped && (
                        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{w.retailer}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-5 rounded-md border border-gold/30 bg-gold/10 p-3 font-mono text-[11px] leading-relaxed text-gold-dark">
              {user
                ? "Tap Apply wig to generate your AI try-on."
                : anonUsed
                  ? "Create a free account to keep trying — 5 free try-ons every month."
                  : "First try-on is free, no signup needed. Then 5 free try-ons every month with a free account."}
            </p>
          </aside>
        </div>
      </div>

      {/* Post-result soft prompt (dismissible) */}
      <AlertDialog open={postPromptOpen} onOpenChange={setPostPromptOpen}>
        <AlertDialogContent className="bg-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-mahogany">
              Love what you see?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/75">
              Create a free account for 5 try-ons every month. No card needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border">Maybe later</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                navigate({ to: "/auth/signup", search: { redirect: redirectTarget } })
              }
              className="bg-mahogany text-cream hover:bg-mahogany-soft"
            >
              Create free account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard wall on second anonymous attempt */}
      <AlertDialog open={wallPromptOpen} onOpenChange={setWallPromptOpen}>
        <AlertDialogContent className="bg-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-mahogany">
              Create a free account to keep going.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/75">
              You've used your free try-on. Create a free account for 5 try-ons every month — no card needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border">Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                navigate({ to: "/auth/login", search: { redirect: redirectTarget } })
              }
              className="border border-mahogany bg-transparent text-mahogany hover:bg-mahogany hover:text-cream"
            >
              Log in
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() =>
                navigate({ to: "/auth/signup", search: { redirect: redirectTarget } })
              }
              className="bg-mahogany text-cream hover:bg-mahogany-soft"
            >
              Create account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
