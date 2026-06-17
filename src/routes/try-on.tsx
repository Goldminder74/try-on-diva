import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Upload, RefreshCw, Sparkles } from "lucide-react";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";
import { WigTryOnEngine } from "@/components/try-on/WigTryOnEngine";
import { fetchFeaturedWigs, type Wig } from "@/lib/wigs";
import { useAsync } from "@/lib/use-async";
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

type Search = { wig?: string };

export const Route = createFileRoute("/try-on")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    wig: typeof s.wig === "string" ? s.wig : undefined,
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

function TryOn() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: featured } = useAsync<Wig[]>(() => fetchFeaturedWigs(9), []);
  const list: Wig[] = featured ?? [];
  const initialWig = (search.wig && list.find((w: Wig) => w.id === search.wig)) || list[0];
  const [photo, setPhoto] = useState<File | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!wig && initialWig) setWig(initialWig);
  }, [initialWig, wig]);

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
    // Signed in: hand off to the real generator with wig preselected.
    navigate({ to: "/app/try-on", search: { wig: wig.id } });
  };

  // Preserve at minimum the wig selection across the auth round-trip.
  const redirectTarget = wig ? `/try-on?wig=${wig.id}` : "/try-on";

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Free try-on</p>
          <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">See it on you.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tip: results improve with bright, even lighting and a clear front-facing selfie.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: try-on canvas */}
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

          {/* Right: wig selector */}
          <aside>
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-gold-dark">Choose a wig</p>
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
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{w.retailer}</p>
                  </div>
                </button>
              ))}
            </div>
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
