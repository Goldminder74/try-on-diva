import { useState } from "react";
import { Download, Share2, Link2, Mail, MessageCircle, Check } from "lucide-react";
import { watermarkImage, downloadBlob } from "@/lib/watermark";

type Props = {
  resultUrl: string;
  wigName?: string | null;
};

const canNativeShareFiles = () => {
  if (typeof navigator === "undefined" || !("share" in navigator)) return false;
  // canShare with files is the reliable detector - Web Share Level 2.
  const probe = new File([new Blob()], "probe.jpg", { type: "image/jpeg" });
  try {
    return Boolean((navigator as any).canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
};

export function TryOnResultActions({ resultUrl, wigName }: Props) {
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const filename = `wigsmi-tryon-${(wigName || "look")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}.jpg`;

  const buildFile = async () => {
    const blob = await watermarkImage(resultUrl);
    return { blob, file: new File([blob], filename, { type: "image/jpeg" }) };
  };

  const onSave = async () => {
    setError(null);
    setBusy("save");
    try {
      const { blob, file } = await buildFile();
      // On mobile with native share-sheet support, "Save to device" is best
      // served by the OS share sheet (which includes "Save Image").
      const isCoarse =
        typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches;
      if (isCoarse && canNativeShareFiles()) {
        try {
          await (navigator as any).share({
            files: [file],
            title: "My Wigsmi try-on",
          });
          return;
        } catch (err) {
          // User cancelled or share failed - fall back to direct download.
          if ((err as DOMException)?.name === "AbortError") return;
        }
      }
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save image.");
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setError(null);
    setBusy("share");
    try {
      const { file } = await buildFile();
      if (canNativeShareFiles()) {
        try {
          await (navigator as any).share({
            files: [file],
            title: "My Wigsmi try-on",
            text: "Tried this wig on with Wigsmi.",
          });
          return;
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return;
          // fall through to fallback
        }
      }
      setFallbackOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share image.");
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy link.");
    }
  };

  const shareText = encodeURIComponent(
    `Tried this wig on with Wigsmi: ${resultUrl}`,
  );
  const mailHref = `mailto:?subject=${encodeURIComponent(
    "My Wigsmi try-on",
  )}&body=${shareText}`;
  const waHref = `https://wa.me/?text=${shareText}`;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-md border border-mahogany bg-mahogany px-4 py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {busy === "save" ? "Preparing…" : "Save to device"}
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-md border border-mahogany bg-transparent px-4 py-2 text-sm font-medium text-mahogany hover:bg-mahogany hover:text-cream disabled:opacity-60"
        >
          <Share2 className="h-4 w-4" />
          {busy === "share" ? "Preparing…" : "Share"}
        </button>
      </div>

      {fallbackOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3">
          <span className="mr-1 text-xs text-muted-foreground">Share via:</span>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-mahogany hover:border-mahogany"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
          <a
            href={mailHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-mahogany hover:border-mahogany"
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-cream px-3 py-1.5 text-xs text-mahogany hover:border-mahogany"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => setFallbackOpen(false)}
            className="ml-auto text-xs text-muted-foreground hover:text-mahogany"
          >
            Close
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Saved and shared images include a small Wigsmi watermark.
      </p>
    </div>
  );
}
