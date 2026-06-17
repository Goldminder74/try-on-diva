import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordTryOn, generateTryOn } from "@/lib/try-on.functions";
import type { Wig } from "@/lib/wigs";

// Read a Blob/File as base64, stripping the data-URL prefix. Exported so the
// route (and the temporary test panel) can reuse it without redefining it.
export function blobToBase64(blob: Blob): Promise<string> {
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

export type UseApplyWig = {
  applying: boolean;
  error: string | null;
  resultUrl: string | null;
  blocked: boolean;
  remaining: number | null;
  applyWig: () => Promise<void>;
  reset: () => void;
};

/**
 * Owns the "Apply wig" generation flow so it lives outside the Lovable-managed
 * route file. Given the selected wig and uploaded photo, applyWig() runs the
 * freemium quota gate, converts the selfie to base64, calls generateTryOn, and
 * exposes loading / error / resultUrl state for the UI to render.
 */
export function useApplyWig(wig: Wig | null, photo: File | null): UseApplyWig {
  const record = useServerFn(recordTryOn);
  const runGenerate = useServerFn(generateTryOn);

  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setResultUrl(null);
    setBlocked(false);
  }, []);

  const applyWig = useCallback(async () => {
    // TEMP DEBUG: log exactly what the hook received on click.
    console.log("[applyWig] click — wig:", wig, "photo:", photo);

    if (!wig) return setError("Pick a wig first.");
    if (!wig.images?.[0]) return setError("This wig has no product image.");
    if (!photo) return setError("Upload a selfie first.");

    setError(null);
    setResultUrl(null);
    setApplying(true);
    try {
      // Freemium quota gate (also records the analytics event + increments the
      // monthly count). Blocks generation once the free allowance is used up.
      const gate = await record({ data: { wigId: wig.id } });
      console.log("[applyWig] quota gate result:", gate);
      if (!gate.allowed) {
        setBlocked(true);
        setError("Free try-on limit reached this month."); // surface it, not just the banner
        return;
      }
      setRemaining(gate.remaining ?? null);

      // Convert the uploaded selfie and call the generation server function.
      const userPhotoBase64 = await blobToBase64(photo);
      const userPhotoMimeType = photo.type as "image/jpeg" | "image/png" | "image/webp";
      const wigImageUrl = new URL(wig.images[0], window.location.origin).href;
      console.log("[applyWig] calling generateTryOn", {
        wigId: wig.id,
        wigImageUrl,
        userPhotoMimeType,
        photoBase64Length: userPhotoBase64.length,
      });

      const out = await runGenerate({
        data: {
          userPhotoBase64,
          userPhotoMimeType,
          wigId: wig.id,
          wigImageUrl,
          wigName: wig.name,
          wigStyleType: wig.style_type || "wig",
          wigColour: wig.colors?.[0] || "natural",
        },
      });
      console.log("[applyWig] generateTryOn result:", out);

      if (!out?.signedUrl) {
        setError("Generation returned no image URL.");
        return;
      }
      setResultUrl(out.signedUrl);
    } catch (err) {
      console.error("[applyWig] error:", err);
      setResultUrl(null);
      setError(err instanceof Error ? err.message : "Try-on generation failed.");
    } finally {
      setApplying(false);
    }
  }, [wig, photo, record, runGenerate]);

  return { applying, error, resultUrl, blocked, remaining, applyWig, reset };
}
