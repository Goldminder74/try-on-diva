// Pure helpers for the retailer outreach sender (no I/O, safe to unit test).
// Outreach emails are queued in public.outreach_outbox by the Mail desk agent
// and sent from info@wigsmi.com through the Gmail API, so links arrive exactly
// as written instead of as google.com redirects.

export const OUTREACH_KINDS = ["first", "follow_up", "reply"] as const;
export type OutreachKind = (typeof OUTREACH_KINDS)[number];

export interface OutboxRow {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body_html: string;
  body_text: string;
  thread_id: string | null;
}

// Every outreach email must carry the company line and the opt-out line
// (Rules v2 section 6); a row without them is rejected, never sent.
export const REQUIRED_COMPANY_TEXT = "company number 13972872";
export const REQUIRED_OPT_OUT_TEXT = "no thanks";

const EMAIL_RE = /^[^@\s<>,;"']+@[^@\s<>,;"']+\.[A-Za-z]{2,}$/;

export function isPlainEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/** Returns a reason the row must not be sent, or null if it may go. */
export function rejectionReason(row: OutboxRow, sender: string): string | null {
  if (!(OUTREACH_KINDS as readonly string[]).includes(row.kind)) return "unknown kind";
  if (!isPlainEmail(row.to_email)) return "recipient is not a single plain email address";
  if (row.to_email.toLowerCase() === sender.toLowerCase()) return "recipient is the sender";
  if (!row.subject.trim() || /[\r\n]/.test(row.subject))
    return "subject is empty or has line breaks";
  if (row.kind !== "first" && !row.thread_id) return "follow-ups and replies need thread_id";
  if (row.kind === "first" && row.thread_id) return "a first email cannot have thread_id";
  for (const [name, body] of [
    ["body_text", row.body_text],
    ["body_html", row.body_html],
  ] as const) {
    const lower = body.toLowerCase();
    if (!lower.includes(REQUIRED_COMPANY_TEXT)) return `${name} is missing the company line`;
    if (!lower.includes(REQUIRED_OPT_OUT_TEXT)) return `${name} is missing the opt-out line`;
    if (lower.includes("google.com/url")) return `${name} contains a google.com redirect link`;
  }
  if (/<\s*(script|iframe|object|embed|form)\b/i.test(row.body_html)) {
    return "body_html contains a disallowed element";
  }
  return null;
}

function utf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64Url(value: string): string {
  return utf8Base64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 2047 encoded-word, only when the value is not plain printable ASCII. */
export function encodeHeaderValue(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`;
}

export function formatFrom(name: string, address: string): string {
  if (/^[\x20-\x7e]*$/.test(name)) {
    return `"${name.replace(/["\\]/g, "")}" <${address}>`;
  }
  return `${encodeHeaderValue(name)} <${address}>`;
}

function wrap76(b64: string): string {
  return b64.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/** Subject that keeps a follow-up in the original Gmail thread. */
export function threadSubject(original: string): string {
  return /^re:/i.test(original.trim()) ? original.trim() : `Re: ${original.trim()}`;
}

export interface MimeInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  inReplyTo?: string | null;
  references?: string | null;
  boundary?: string;
}

export function buildMime(input: MimeInput): string {
  const boundary = input.boundary ?? `wigsmi-${crypto.randomUUID()}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references) headers.push(`References: ${input.references}`);
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  const part = (type: string, body: string) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(utf8Base64(body)),
    ].join("\r\n");
  return [
    headers.join("\r\n"),
    "",
    part("text/plain", input.text),
    part("text/html", input.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}
