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

  // Watermark sizing: target ~13% of image width.
  const targetW = Math.round(w * 0.13);
  const padding = Math.round(w * 0.025);
  // Font sized so "wigsmi." fits roughly the target width (~6.4 chars × 0.55em).
  const fontSize = Math.round(targetW / 3.2);

  ctx.font = `500 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "alphabetic";

  const text = "wigsmi";
  const dot = ".";
  const textMetrics = ctx.measureText(text);
  const dotMetrics = ctx.measureText(dot);
  const totalW = textMetrics.width + dotMetrics.width;

  const position = opts.position ?? "br";
  const x = position === "br" ? w - padding - totalW : padding;
  const y = h - padding;

  // Soft dark shadow so it stays legible on light or busy backgrounds.
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.08));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.04));

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#FAF5EE"; // cream
  ctx.fillText(text, x, y);

  ctx.fillStyle = "#C8A95B"; // gold accent dot
  ctx.fillText(dot, x + textMetrics.width, y);

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
