// Bakes a Wigsmi wordmark watermark into a try-on result image and returns
// a JPEG Blob. The watermark is drawn into the file itself so it travels
// with any saved/shared copy and cannot be removed by a re-screenshot.

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load result image for watermarking."));
    img.src = url;
  });

export async function watermarkImage(
  sourceUrl: string,
  opts: { position?: "br" | "bl" } = {},
): Promise<Blob> {
  const img = await loadImage(sourceUrl);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(img, 0, 0, w, h);

  // Auto-pick a corner: sample both bottom corners and prefer whichever has
  // the higher variance-to-darkness ratio (i.e. more "background", less hair).
  // Falls back to bottom-right when the choice is ambiguous.
  const padding = Math.round(w * 0.025);
  const markBoxW = Math.round(w * 0.13);
  const markBoxH = Math.round(markBoxW * 0.45);
  const sampleCorner = (xStart: number) => {
    const sx = Math.max(0, xStart);
    const sy = Math.max(0, h - padding - markBoxH);
    const sw = Math.min(markBoxW, w - sx);
    const sh = Math.min(markBoxH, h - sy);
    try {
      const { data } = ctx.getImageData(sx, sy, sw, sh);
      let sum = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      return sum / n; // mean brightness 0–255
    } catch {
      return 255; // CORS-tainted canvas → assume background, keep BR
    }
  };
  const brBrightness = sampleCorner(w - padding - markBoxW);
  const blBrightness = sampleCorner(padding);
  // Prefer the brighter corner (background, not hair). Bias toward BR.
  const position: "br" | "bl" = opts.position ?? (blBrightness - brBrightness > 25 ? "bl" : "br");
  const targetW = w * 0.13;
  // The WIGSMI wordmark: Bodoni capitals, set wide (the site's own font is
  // already loaded on the page that downloads).
  const fontFamily = `"Bodoni Moda", "Bodoni 72", Didot, Georgia, serif`;
  const tracked = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const setFont = (size: number) => {
    ctx.font = `400 ${size}px ${fontFamily}`;
    tracked.letterSpacing = `${Math.round(size * 0.2)}px`;
  };
  const measure = (size: number) => {
    setFont(size);
    return ctx.measureText("WIGSMI").width;
  };
  let lo = 8,
    hi = 200;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) >> 1;
    if (measure(mid) < targetW) lo = mid + 1;
    else hi = mid - 1;
  }
  const fontSize = lo;
  setFont(fontSize);
  ctx.textBaseline = "alphabetic";

  const text = "WIGSMI";
  const totalW = ctx.measureText(text).width;

  const x = position === "br" ? w - padding - totalW : padding;
  const y = h - padding;

  // Soft dark shadow so it stays legible on light or busy backgrounds.
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.08));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.04));

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#EADDC1"; // champagne
  ctx.fillText(text, x, y);
  tracked.letterSpacing = "0px";

  ctx.shadowColor = "transparent";
  ctx.globalAlpha = 1;

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode image."))),
      "image/jpeg",
      0.92,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
