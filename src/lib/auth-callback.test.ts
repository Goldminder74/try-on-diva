import { describe, it, expect, vi } from "vitest";
import { resolveCallback, maybeSendWelcome, welcomedKey, POST_AUTH_REDIRECT_KEY } from "./auth-callback";
import { buildWelcomeEmail } from "./email/welcome-payload";

function store(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

function deps(o: { session?: boolean; roles?: string[]; stashed?: string; welcomed?: boolean; sendFails?: boolean } = {}) {
  const sendWelcome = vi.fn(async () => {
    if (o.sendFails) throw new Error("smtp down");
    return { ok: true };
  });
  return {
    getSession: async () => (o.session === false ? null : { user: { id: "u1" } }),
    getRoles: async () => o.roles ?? ["consumer"],
    sendWelcome,
    local: store(o.welcomed ? { [welcomedKey("u1")]: "1" } : {}),
    session: store(o.stashed ? { [POST_AUTH_REDIRECT_KEY]: o.stashed } : {}),
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("auth callback (email confirmation / Google sign-in)", () => {
  it("no session sends the user to login", async () => {
    expect(await resolveCallback("", deps({ session: false }))).toBe("/auth/login");
  });

  it("shopper lands on /app", async () => {
    expect(await resolveCallback("", deps())).toBe("/app");
  });

  it("retailer lands on /portal", async () => {
    expect(await resolveCallback("", deps({ roles: ["retailer"] }))).toBe("/portal");
  });

  it("?next= wins over role default (plan resume)", async () => {
    const d = deps({ roles: ["retailer"] });
    expect(await resolveCallback("?next=%2Fportal%2Fbilling%3Fplan%3Dgrowth", d)).toBe("/portal/billing?plan=growth");
  });

  it("stashed redirect is honoured and then cleared", async () => {
    const d = deps({ stashed: "/try-on?wig=bob" });
    expect(await resolveCallback("", d)).toBe("/try-on?wig=bob");
    expect(d.session.m.has(POST_AUTH_REDIRECT_KEY)).toBe(false);
  });

  it("external redirects are rejected", async () => {
    expect(await resolveCallback("?next=https://evil.com", deps())).toBe("/app");
    expect(await resolveCallback("?next=//evil.com", deps())).toBe("/app");
  });

  it("sends the welcome email once on first sign-in", async () => {
    const d = deps();
    await resolveCallback("", d);
    await flush();
    expect(d.sendWelcome).toHaveBeenCalledTimes(1);
    expect(d.local.getItem(welcomedKey("u1"))).toBe("1");
  });

  it("does not resend the welcome email to an already welcomed user", async () => {
    const d = deps({ welcomed: true });
    await resolveCallback("", d);
    await flush();
    expect(d.sendWelcome).not.toHaveBeenCalled();
  });

  it("a failed welcome email doesn't block sign-in and retries next time", async () => {
    const d = deps({ sendFails: true });
    expect(await resolveCallback("", d)).toBe("/app");
    expect(await maybeSendWelcome("u1", d)).toBe(false);
    expect(d.local.getItem(welcomedKey("u1"))).toBeNull();
  });
});

describe("welcome email selection", () => {
  const base = { userId: "u1", email: "jo@x.com", origin: "https://wigsmi.com" };
  it("shoppers get consumer-welcome linking to /app", () => {
    const e = buildWelcomeEmail({ ...base, roles: ["consumer"] });
    expect(e.templateName).toBe("consumer-welcome");
    expect(e.idempotencyKey).toBe("consumer-welcome-u1");
    expect(e.templateData).toMatchObject({ name: "jo", appUrl: "https://wigsmi.com/app" });
  });
  it("retailers get retailer-welcome linking to /portal", () => {
    const e = buildWelcomeEmail({ ...base, roles: ["retailer"], businessName: "Crown Co" });
    expect(e.templateName).toBe("retailer-welcome");
    expect(e.idempotencyKey).toBe("retailer-welcome-u1");
    expect(e.templateData).toMatchObject({ businessName: "Crown Co", portalUrl: "https://wigsmi.com/portal" });
  });
});
