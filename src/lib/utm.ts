// First-visit campaign tags (utm_source, utm_medium, utm_campaign).
// Kept in a first-party cookie so server handlers (Buy clicks, anonymous
// try-ons) can read them, and passed into sign-up so the profile keeps them.

export type Utm = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null };

export const UTM_COOKIE = "wigsmi_utm";
const KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const EMPTY: Utm = { utm_source: null, utm_medium: null, utm_campaign: null };

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 200);
  return t ? t : null;
}

/** Reads the three tags from a URL query string. Returns null when none are present. */
export function utmFromSearch(search: string): Utm | null {
  const params = new URLSearchParams(search);
  const out: Utm = { ...EMPTY };
  let any = false;
  for (const k of KEYS) {
    out[k] = clean(params.get(k));
    if (out[k]) any = true;
  }
  return any ? out : null;
}

/** Parses the stored cookie value out of a Cookie header (or document.cookie). */
export function utmFromCookieHeader(header: string | null | undefined): Utm {
  if (!header) return { ...EMPTY };
  const part = header.split(/;\s*/).find((c) => c.startsWith(`${UTM_COOKIE}=`));
  if (!part) return { ...EMPTY };
  try {
    const parsed = JSON.parse(decodeURIComponent(part.slice(UTM_COOKIE.length + 1)));
    return { utm_source: clean(parsed?.utm_source), utm_medium: clean(parsed?.utm_medium), utm_campaign: clean(parsed?.utm_campaign) };
  } catch {
    return { ...EMPTY };
  }
}

/** Browser only: store tags from the landing URL, first visit wins. */
export function captureUtmOnFirstVisit() {
  if (typeof document === "undefined") return;
  if (document.cookie.split(/;\s*/).some((c) => c.startsWith(`${UTM_COOKIE}=`))) return;
  const found = utmFromSearch(window.location.search);
  if (!found) return;
  const value = encodeURIComponent(JSON.stringify(found));
  document.cookie = `${UTM_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 90}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

/** Browser only: the stored first-visit tags. */
export function storedUtm(): Utm {
  if (typeof document === "undefined") return { ...EMPTY };
  return utmFromCookieHeader(document.cookie);
}
