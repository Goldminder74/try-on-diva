/**
 * Pure post-sign-in logic for /auth/callback (email confirmation + Google OAuth).
 * Dependencies are injected so the whole flow is testable without a browser.
 */

export const POST_AUTH_REDIRECT_KEY = "wigsmi:postAuthRedirect";
export const welcomedKey = (userId: string) => `wigsmi:welcomed:${userId}`;

export function safeRedirect(r: string | null | undefined, fallback: string): string {
  if (!r) return fallback;
  if (!r.startsWith("/") || r.startsWith("//") || r.startsWith("/\\")) return fallback;
  return r;
}

export interface CallbackDeps {
  getSession: () => Promise<{ user: { id: string } } | null>;
  getRoles: (userId: string) => Promise<string[]>;
  sendWelcome: () => Promise<unknown>;
  local: Pick<Storage, "getItem" | "setItem">;
  session: Pick<Storage, "getItem" | "removeItem">;
}

/** Sends the welcome email once per user; never throws. */
export async function maybeSendWelcome(userId: string, deps: Pick<CallbackDeps, "sendWelcome" | "local">) {
  try {
    const key = welcomedKey(userId);
    if (deps.local.getItem(key)) return false;
    await deps.sendWelcome();
    deps.local.setItem(key, "1");
    return true;
  } catch (err) {
    console.warn("[welcome-email] skipped:", err);
    return false;
  }
}

/** Runs the callback flow and returns where the user should be sent. */
export async function resolveCallback(search: string, deps: CallbackDeps): Promise<string> {
  const next = new URLSearchParams(search).get("next");
  const stashed = deps.session.getItem(POST_AUTH_REDIRECT_KEY);
  deps.session.removeItem(POST_AUTH_REDIRECT_KEY);

  const session = await deps.getSession();
  if (!session) return "/auth/login";

  // Fire-and-forget: email problems must never block sign-in.
  void maybeSendWelcome(session.user.id, deps);

  let roles: string[] = [];
  try {
    roles = await deps.getRoles(session.user.id);
  } catch {
    roles = [];
  }
  const fallback = roles.includes("retailer") ? "/portal" : "/app";
  return safeRedirect(next ?? stashed, fallback);
}
