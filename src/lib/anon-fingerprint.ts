// Lightweight client-side fingerprint + persistent deviceId for the one-free
// anonymous try-on flow. Not a security boundary on its own — the server also
// hashes the request IP and enforces uniqueness in `anonymous_tryons`.

const DEVICE_KEY = "wigsmi:anonDeviceId";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    // localStorage blocked — fall back to ephemeral id (server fingerprint/IP
    // still catches repeat use within the same session).
    return crypto.randomUUID();
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const nav = window.navigator;
  const screen = window.screen;
  const parts = [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(","),
    String(nav.hardwareConcurrency || 0),
    String((nav as any).deviceMemory || 0),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
  ];

  // Cheap canvas signal to distinguish browsers on the same machine.
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 200, 40);
      ctx.fillStyle = "#069";
      ctx.fillText("wigsmi-fp", 2, 2);
      parts.push(canvas.toDataURL().slice(-64));
    }
  } catch {
    /* canvas blocked — ignore */
  }

  return sha256Hex(parts.join("|"));
}
