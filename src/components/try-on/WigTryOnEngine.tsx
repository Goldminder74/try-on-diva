/**
 * WigTryOnEngine - PLACEHOLDER COMPONENT
 * ----------------------------------------------------------------
 * This is a SIMULATED try-on engine. The real AR/computer-vision
 * wig overlay engine will be implemented by a freelancer and will
 * replace this file's internals.
 *
 * IMPORTANT for the freelancer:
 *   - Keep the props interface (WigTryOnEngineProps) stable.
 *   - Keep the AR_ENGINE_VERSION export. Bump it when swapping in
 *     the real engine (e.g. 'sdk-v1.0').
 *   - Every consumer screen uses ONLY this component for try-ons.
 *
 * No external AR libraries. No network calls except loading image
 * URLs already provided in props.
 * ----------------------------------------------------------------
 */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";

export const AR_ENGINE_VERSION = "placeholder-v1";

export interface WigTryOnEngineProps {
  photo: File | string | null;
  wig: {
    id: string;
    name: string;
    images: string[];
    ar_asset_url: string | null;
    style_type: string;
    hair_texture: string;
  } | null;
  /** Fitzpatrick 1–6. Reserved for the real engine. */
  skinTone?: number;
  onTryOnComplete?: (resultImageUrl: string) => void;
  onTryOnError?: (error: Error) => void;
  onTryOnStart?: () => void;
  className?: string;
  showLoadingState?: boolean;
}

function usePhotoUrl(photo: File | string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) {
      setUrl(null);
      return;
    }
    if (typeof photo === "string") {
      setUrl(photo);
      return;
    }
    const objectUrl = URL.createObjectURL(photo);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);
  return url;
}

export function WigTryOnEngine({
  photo,
  wig,
  onTryOnComplete,
  onTryOnError,
  onTryOnStart,
  className = "",
  showLoadingState = true,
}: WigTryOnEngineProps) {
  const photoUrl = usePhotoUrl(photo);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!photoUrl || !wig) {
      setResultReady(false);
      return;
    }
    setIsProcessing(true);
    setResultReady(false);
    onTryOnStart?.();
    const t = setTimeout(() => {
      try {
        setIsProcessing(false);
        setResultReady(true);
        onTryOnComplete?.(photoUrl);
      } catch (err) {
        onTryOnError?.(err as Error);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [photoUrl, wig?.id]);

  const baseCard =
    "relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-sand";

  // No photo
  if (!photoUrl) {
    return (
      <div className={`${baseCard} ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-mahogany">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="font-display text-lg text-mahogany">Upload a selfie to try this on.</p>
          <p className="text-sm text-muted-foreground">JPEG, PNG or WebP. Max 10 MB.</p>
        </div>
      </div>
    );
  }

  // Photo but no wig
  if (!wig) {
    return (
      <div className={`${baseCard} ${className}`} ref={containerRef}>
        <img src={photoUrl} alt="Your selfie" className="h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-mahogany/70 to-transparent p-6">
          <p className="font-display text-lg text-cream">Select a wig to try on.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (isProcessing && showLoadingState) {
    return (
      <div className={`${baseCard} ${className}`}>
        <img src={photoUrl} alt="Your selfie" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 shimmer opacity-40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-mahogany">
          <Sparkles className="h-6 w-6 animate-pulse text-gold" />
          <p className="font-display text-lg">Trying on {wig.name}…</p>
        </div>
      </div>
    );
  }

  // Result - overlay wig image at top of selfie
  return (
    <div className={`${baseCard} ${className}`} ref={containerRef}>
      <img src={photoUrl} alt="Your selfie" className="h-full w-full object-cover" />
      {resultReady && wig.images[0] && (
        <img
          src={wig.images[0]}
          alt={wig.name}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[55%] w-full object-cover opacity-60 mix-blend-multiply"
          style={{ maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)" }}
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-mahogany/85 px-3 py-2 backdrop-blur-sm">
        <span className="text-xs font-medium text-cream">{wig.name}</span>
        <span className="rounded-sm bg-gold/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mahogany">
          Preview mode · AR coming soon
        </span>
      </div>
    </div>
  );
}

export default WigTryOnEngine;
