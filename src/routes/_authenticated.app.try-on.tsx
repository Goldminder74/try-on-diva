import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, RefreshCw, FlaskConical } from "lucide-react";
import { WigTryOnEngine } from "@/components/try-on/WigTryOnEngine";
import { fetchFeaturedWigs, type Wig } from "@/lib/wigs";
import { useServerFn } from "@tanstack/react-start";
import { recordTryOn, getTryOnQuota, uploadTryOnResult, generateTryOn } from "@/lib/try-on.functions";
import { Link } from "@tanstack/react-router";
// TEMP: placeholder selfie for the generate test (same-origin bundled asset). Remove with the panel.
import heroModel from "@/assets/hero-model.jpg";

export const Route = createFileRoute("/_authenticated/app/try-on")({
  validateSearch: (s: Record<string, unknown>) => ({
    wig: typeof s.wig === "string" ? s.wig : undefined,
  }),
  head: () => ({ meta: [{ title: "Try on — Wigsmi" }] }),
  component: AppTryOn,
});

// 1x1 transparent PNG, base64 (no data-URL prefix).
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// TEMP: read a Blob/File as base64 (strips the data-URL prefix). Remove with the panel.
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// TEMP: state shape for the storage self-test. Remove with the panel before launch.
type StorageTest = {
  running: boolean;
  path?: string;
  signedUrl?: string;
  publicUrl?: string;
  publicResult?: "checking" | "failed" | "loaded";
  error?: string;
};

// TEMP: state shape for the Gemini generate test. Remove with the panel before launch.
type GenerateTest = {
  running: boolean;
  source?: string;
  wigName?: string;
  model?: string;
  path?: string;
  signedUrl?: string;
  error?: string;
};

function AppTryOn() {
  const search = Route.useSearch();
  const [list, setList] = useState<Wig[]>([]);
  const [wig, setWig] = useState<Wig | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number | null; isPaid: boolean } | null>(null);
  const [blocked, setBlocked] = useState(false);

  const record = useServerFn(recordTryOn);
  const fetchQuota = useServerFn(getTryOnQuota);

  // TEMP: storage self-test wiring. Remove before launch.
  const runUpload = useServerFn(uploadTryOnResult);
  const [test, setTest] = useState<StorageTest | null>(null);

  // TEMP: Gemini generate-test wiring. Remove before launch.
  const runGenerate = useServerFn(generateTryOn);
  const [gen, setGen] = useState<GenerateTest | null>(null);

  useEffect(() => {
    fetchFeaturedWigs(9).then((items) => {
      setList(items);
      const initial = (search.wig && items.find((w) => w.id === search.wig)) || items[0] || null;
      setWig(initial);
    });
    fetchQuota().then((q) => setQuota({ remaining: q.remaining, isPaid: q.isPaid }));
  }, [fetchQuota, search.wig]);

  const onTryOn = async () => {
    if (!wig) return;
    setError(null);
    try {
      const res = await record({ data: { wigId: wig.id } });
      if (!res.allowed) {
        setBlocked(true);
        return;
      }
      setQuota((q) => (q ? { ...q, remaining: res.remaining } : q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record try-on.");
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return setError("File too large — max 10MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Use JPEG, PNG or WebP.");
    setError(null);
    setPhoto(f);
  };

  // TEMP: uploads a 1x1 PNG, then checks the signed URL loads and the public URL
  // is blocked (proving the bucket is private). Remove before launch.
  const runStorageTest = async () => {
    setTest({ running: true });
    try {
      const res = await runUpload({ data: { wigId: "test-sku", imageBase64: TINY_PNG } });
      const signedUrl = res.signedUrl;
      // Derive the public-style URL: swap the sign path and drop the token query.
      const publicUrl = signedUrl.replace("/object/sign/", "/object/public/").split("?")[0];

      setTest({
        running: false,
        path: res.path,
        signedUrl,
        publicUrl,
        publicResult: "checking",
      });

      // A private bucket must reject this. fetch resolving with !ok, or throwing,
      // both count as "failed" => good.
      try {
        const r = await fetch(publicUrl, { method: "GET" });
        setTest((t) => (t ? { ...t, publicResult: r.ok ? "loaded" : "failed" } : t));
      } catch {
        setTest((t) => (t ? { ...t, publicResult: "failed" } : t));
      }
    } catch (err) {
      setTest({ running: false, error: err instanceof Error ? err.message : "Storage test failed." });
    }
  };

  // TEMP: fires generateTryOn end to end with the first catalogue wig and either
  // the uploaded selfie or a placeholder photo, then renders the result. Remove
  // before launch.
  const runGenerateTest = async () => {
    setGen({ running: true });
    try {
      const testWig = list[0];
      if (!testWig) throw new Error("No wig in the catalogue yet.");
      if (!testWig.images?.[0]) throw new Error("First wig has no product image.");

      // Photo: uploaded selfie if present, else the bundled hero image (same-origin).
      let userPhotoBase64: string;
      let userPhotoMimeType: "image/jpeg" | "image/png" | "image/webp";
      let source: string;
      if (photo) {
        userPhotoBase64 = await blobToBase64(photo);
        userPhotoMimeType = photo.type as "image/jpeg" | "image/png" | "image/webp";
        source = "uploaded selfie";
      } else {
        const blob = await (await fetch(heroModel)).blob();
        userPhotoBase64 = await blobToBase64(blob);
        userPhotoMimeType = "image/jpeg";
        source = "placeholder photo";
      }

      // Make the wig image URL absolute so the server can fetch it.
      const wigImageUrl = new URL(testWig.images[0], window.location.origin).href;

      const res = await runGenerate({
        data: {
          userPhotoBase64,
          userPhotoMimeType,
          wigId: testWig.id,
          wigImageUrl,
          wigName: testWig.name,
          wigStyleType: testWig.style_type || "wig",
          wigColour: testWig.colors?.[0] || "natural",
        },
      });

      setGen({
        running: false,
        source,
        wigName: testWig.name,
        model: res.model,
        path: res.path,
        signedUrl: res.signedUrl,
      });
    } catch (err) {
      setGen({ running: false, error: err instanceof Error ? err.message : "Generate test failed." });
    }
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
            <span className="font-mono text-gold-dark">{quota.remaining ?? 0}</span> free try-ons left this month
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
              onClick={onTryOn}
              disabled={!wig || blocked}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream disabled:opacity-50"
            >
              Apply wig
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

      {/* ===================================================================== */}
      {/* TEMPORARY — Storage self-test. Remove this whole block before launch.  */}
      {/* ===================================================================== */}
      <section className="mt-12 rounded-xl border-2 border-dashed border-gold/50 bg-gold/5 p-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-gold-dark" />
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
            Temporary test — remove before launch
          </p>
        </div>
        <h2 className="mt-2 font-display text-2xl text-mahogany">Storage signed-URL test</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Uploads a 1×1 PNG via <code>uploadTryOnResult</code> (wigId <code>"test-sku"</code>), then checks that
          the signed URL loads and the public URL is blocked.
        </p>

        <button
          onClick={runStorageTest}
          disabled={test?.running}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
        >
          <FlaskConical className="h-4 w-4" />
          {test?.running ? "Running…" : "Run storage test"}
        </button>

        {test?.error && (
          <p className="mt-4 rounded-md bg-error/10 px-3 py-2 text-sm text-error">Error: {test.error}</p>
        )}

        {test && !test.error && !test.running && (
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">Stored path</p>
              <p className="mt-1 break-all font-mono text-foreground">{test.path}</p>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">Signed URL</p>
              <p className="mt-1 break-all font-mono text-xs text-foreground/80">{test.signedUrl}</p>
              <p className="mt-2 text-xs text-foreground/60">
                Image below should render (signed URLs work):
              </p>
              {test.signedUrl && (
                <img
                  src={test.signedUrl}
                  alt="signed-url result"
                  className="mt-2 h-16 w-16 rounded border border-border bg-[repeating-conic-gradient(#ddd_0_25%,#fff_0_50%)] bg-[length:12px_12px] object-contain"
                />
              )}
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">
                Public URL check (bucket privacy)
              </p>
              <p className="mt-1 break-all font-mono text-xs text-foreground/80">{test.publicUrl}</p>
              {test.publicResult === "checking" && (
                <p className="mt-2 text-foreground/60">Checking…</p>
              )}
              {test.publicResult === "failed" && (
                <p className="mt-2 rounded-md bg-success/10 px-3 py-2 font-medium text-success">
                  ✓ FAILED to load — good. The bucket is private.
                </p>
              )}
              {test.publicResult === "loaded" && (
                <p className="mt-2 rounded-md bg-error/10 px-3 py-2 font-medium text-error">
                  ✗ LOADED — bad. The bucket is still public; set it to private.
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- Gemini generate test (end to end) --- */}
        <div className="mt-8 border-t border-gold/30 pt-6">
          <h2 className="font-display text-2xl text-mahogany">Gemini generate test</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Calls <code>generateTryOn</code> with the first catalogue wig and your uploaded selfie
            (or a placeholder photo if none). The generated image renders below. This is where we
            check skin tone is preserved and the wig is faithful.
          </p>

          <button
            onClick={runGenerateTest}
            disabled={gen?.running || list.length === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-mahogany px-4 py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" />
            {gen?.running ? "Generating…" : "Run generate test"}
          </button>

          {gen?.error && (
            <p className="mt-4 rounded-md bg-error/10 px-3 py-2 text-sm text-error">Error: {gen.error}</p>
          )}

          {gen && !gen.error && !gen.running && (
            <div className="mt-5 space-y-4 text-sm">
              <p className="text-xs text-foreground/60">
                Wig: <span className="font-medium text-foreground">{gen.wigName}</span> · Photo: {gen.source}
                {gen.model ? <> · Model: <span className="font-medium text-foreground">{gen.model}</span></> : null}
              </p>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">Stored path</p>
                <p className="mt-1 break-all font-mono text-foreground">{gen.path}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">Signed URL</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground/80">{gen.signedUrl}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-foreground/50">Generated image</p>
                {gen.signedUrl && (
                  <img
                    src={gen.signedUrl}
                    alt="generated try-on result"
                    className="mt-2 w-full max-w-sm rounded-lg border border-border"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      {/* ===================== END TEMPORARY TEST BLOCK ====================== */}
    </div>
  );
}
