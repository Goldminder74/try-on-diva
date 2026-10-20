import { safeRedirect } from "./auth-callback";

export function retailerAuthRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const plan = params.get("plan");
  if (plan) {
    const query = new URLSearchParams({ plan });
    const interval = params.get("interval");
    if (interval) query.set("interval", interval);
    return `/portal/billing?${query.toString()}`;
  }
  return safeRedirect(params.get("redirect"), "/portal");
}