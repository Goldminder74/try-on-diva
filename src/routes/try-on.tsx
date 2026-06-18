import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  type RetailerPublic,
} from "@/lib/wigs";
import { getPublicWidgetData } from "@/lib/widget-public.functions";
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

  const [list, setList] = useState<Wig[]>([]);
  const [retailerScope, setRetailerScope] = useState<RetailerScope | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const scoped = Boolean(search.widget || search.r) && !showAll;

  // Load catalogue based on URL scope (widget token, retailer slug, or full).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Widget token → use server fn (returns retailer + scoped wigs)
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
          /* fall through to default */
        }
      }

      // 2. Retailer slug → resolve then fetch wigs
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

      // 3. Default: featured catalogue
      setRetailerScope(null);
      const wigs = await fetchFeaturedWigs(9);
      if (!cancelled) setList(wigs);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [search.widget, search.r, showAll, fetchWidget]);

  // Sync selected wig with current list / ?wig=
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
    setPhoto(f);
  };

  const onApply = () => {
    if (!wig) { setError("Pick a wig first."); return; }
    setError(null);
    if (authLoading) return;
    if (!user) {
      setPromptOpen(true);
      return;
    }
    navigate({ to: "/app/try-on", search: { wig: wig.id } });
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

        {!scoped && (search.widget || search.r) && retailerScope === null && showAll && (
          <div className="mb-6">
            <Link
              to="/try-on"
              search={{ widget: search.widget, r: search.r }}
              onClick={(e) => { e.preventDefault(); setShowAll(false); }}
              className="text-xs text-mahogany underline-offset-4 hover:underline"
            >
              ← Back to the retailer's styles
            </Link>
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
            <WigTryOnEngine photo={photo} wig={wig} skinTone={4} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-mahogany bg-transparent px-4 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream"
              >
                <Upload className="h-4 w-4" /> {photo ? "Change photo" : "Upload selfie"}
              </button>
              {photo && (
                <button
                  onClick={() => setPhoto(null)}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-mahogany"
                >
                  <RefreshCw className="h-4 w-4" /> Reset
                </button>
              )}
              <button
                onClick={onApply}
                disabled={!wig}
                className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream disabled:opacity-50"
                style={accent && scoped ? { backgroundColor: accent, color: "#fff" } : undefined}
              >
                <Sparkles className="h-4 w-4" /> Apply wig
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
                    onClick={() => setWig(w)}
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
              Tap Apply wig to generate your AI try-on. Free account, 5 try-ons every month.
            </p>
          </aside>
        </div>
      </div>

      <AlertDialog open={promptOpen} onOpenChange={setPromptOpen}>
        <AlertDialogContent className="bg-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-mahogany">
              Create a free account to try this wig on.
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/75">
              You get 5 free try-ons every month, no card needed.
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
