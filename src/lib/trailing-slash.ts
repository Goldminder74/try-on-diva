/**
 * Returns the canonical URL (no trailing slash) for an HTML page request that
 * ends in "/", or null when no redirect applies. The root, API, internal and
 * asset-like paths (last segment contains a dot) are never redirected.
 */
export function trailingSlashTarget(url: string, method = "GET"): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  const u = new URL(url);
  const p = u.pathname;
  if (p === "/" || !p.endsWith("/")) return null;
  if (/^\/(api|lovable|_serverFn|_build|assets|@)/.test(p)) return null;
  const trimmed = p.replace(/\/+$/, "");
  if (!trimmed || trimmed.startsWith("//")) return null;
  if (trimmed.split("/").pop()!.includes(".")) return null;
  return trimmed + u.search;
}
