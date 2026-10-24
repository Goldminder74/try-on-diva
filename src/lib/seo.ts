export const SITE_ORIGIN = "https://wigsmi.com";

export function pageUrl(path: string) {
  return new URL(path, SITE_ORIGIN).href;
}

export function absoluteImage(url: string) {
  return new URL(url, SITE_ORIGIN).href;
}

// Uploaded product photos use the existing public image transformation service.
// Local photos retain their original URL; no unrelated share image is substituted.
export function productShareImage(image: string | undefined) {
  if (!image?.startsWith("https://")) return undefined;
  const url = new URL(image);
  if (url.pathname.includes("/storage/v1/object/public/")) {
    url.pathname = url.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    url.searchParams.set("width", "1200");
    url.searchParams.set("height", "630");
    url.searchParams.set("resize", "cover");
    url.searchParams.set("quality", "80");
  }
  return url.href;
}