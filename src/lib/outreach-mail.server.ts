// Server-only: sends queued retailer outreach from info@wigsmi.com through the
// Gmail API. The Google OAuth client id and secret are site secrets; the
// refresh token is stored in public.outreach_gmail_auth, which only the
// service role can read. Never import this from client components.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildMime,
  base64Url,
  formatFrom,
  rejectionReason,
  threadSubject,
  type OutboxRow,
} from "@/lib/outreach-mail";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.metadata",
];
export const GMAIL_REDIRECT_URI = "https://wigsmi.com/api/public/gmail-oauth/callback";

export function outreachSender(): string {
  return (process.env.OUTREACH_SENDER || "info@wigsmi.com").toLowerCase();
}

function fromName(): string {
  return process.env.OUTREACH_FROM_NAME || "Wigsmi Try-On Studio";
}

function dailyCap(): number {
  const n = Number(process.env.OUTREACH_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 60;
}

export function googleClient(): { id: string; secret: string } | null {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

const db = () => supabaseAdmin as any;

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function exchangeGoogleToken(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google token error ${res.status}: ${json.error ?? "unknown"}`);
  }
  return json as { access_token: string; expires_in: number; refresh_token?: string };
}

async function accessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const client = googleClient();
  if (!client) return null;
  const { data } = await db()
    .from("outreach_gmail_auth")
    .select("refresh_token, email")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.refresh_token || data.email?.toLowerCase() !== outreachSender()) return null;
  const token = await exchangeGoogleToken({
    client_id: client.id,
    client_secret: client.secret,
    refresh_token: data.refresh_token,
    grant_type: "refresh_token",
  });
  cachedToken = { value: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  return token.access_token;
}

export async function gmailFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Gmail ${res.status}: ${json?.error?.message ?? "request failed"}`);
    (err as any).status = res.status;
    throw err;
  }
  return json;
}

async function threadContext(token: string, threadId: string) {
  const thread = await gmailFetch(
    token,
    `threads/${encodeURIComponent(threadId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
  );
  const messages: any[] = thread.messages ?? [];
  if (!messages.length) throw new Error("thread has no messages");
  const header = (m: any, name: string) =>
    (m.payload?.headers ?? []).find((h: any) => h.name?.toLowerCase() === name.toLowerCase())
      ?.value as string | undefined;
  const first = messages[0];
  const last = messages[messages.length - 1];
  const lastId = header(last, "Message-ID");
  const refs = [header(last, "References"), lastId].filter(Boolean).join(" ");
  return {
    subject: threadSubject(header(first, "Subject") ?? ""),
    inReplyTo: lastId ?? null,
    references: refs || null,
  };
}

async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await db()
    .from("suppressed_emails")
    .select("id")
    .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
    .limit(1);
  return !!data?.length;
}

async function finish(id: string, fields: Record<string, unknown>) {
  await db().from("outreach_outbox").update(fields).eq("id", id);
}

export interface OutboxResult {
  connected: boolean;
  sent: number;
  rejected: number;
  failed: number;
  remainingToday: number;
}

/** Sends queued outreach, oldest first, within the daily cap. Never throws. */
export async function processOutbox(limit = 20): Promise<OutboxResult> {
  const result: OutboxResult = {
    connected: false,
    sent: 0,
    rejected: 0,
    failed: 0,
    remainingToday: 0,
  };
  try {
    // Rows left in 'sending' by an interrupted run go back to the queue.
    await db()
      .from("outreach_outbox")
      .update({ status: "queued" })
      .eq("status", "sending")
      .lt("claimed_at", new Date(Date.now() - 10 * 60_000).toISOString());

    const token = await accessToken();
    if (!token) return result;
    result.connected = true;

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await db()
      .from("outreach_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", since);
    let remaining = Math.max(0, dailyCap() - (count ?? 0));
    result.remainingToday = remaining;
    if (remaining === 0) return result;

    const { data: rows } = await db()
      .from("outreach_outbox")
      .select("id, kind, to_email, subject, body_html, body_text, thread_id, country, attempts")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(Math.min(limit, remaining));

    const sender = outreachSender();
    for (const row of (rows ?? []) as (OutboxRow & { attempts: number })[]) {
      if (remaining <= 0) break;
      const { data: claimed } = await db()
        .from("outreach_outbox")
        .update({
          status: "sending",
          attempts: row.attempts + 1,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("status", "queued")
        .select("id");
      if (!claimed?.length) continue;

      const reason =
        rejectionReason(row, sender) ??
        ((await isSuppressed(row.to_email)) ? "recipient is on the suppression list" : null);
      if (reason) {
        await finish(row.id, { status: "rejected", error: reason });
        result.rejected++;
        continue;
      }

      try {
        const ctx = row.thread_id ? await threadContext(token, row.thread_id) : null;
        const mime = buildMime({
          from: formatFrom(fromName(), sender),
          to: row.to_email,
          subject: ctx?.subject ?? row.subject,
          html: row.body_html,
          text: row.body_text,
          inReplyTo: ctx?.inReplyTo,
          references: ctx?.references,
        });
        const sent = await gmailFetch(token, "messages/send", {
          method: "POST",
          body: JSON.stringify({
            raw: base64Url(mime),
            ...(row.thread_id ? { threadId: row.thread_id } : {}),
          }),
        });
        await finish(row.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          gmail_message_id: sent.id ?? null,
          gmail_thread_id: sent.threadId ?? null,
          error: null,
        });
        result.sent++;
        remaining--;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = (err as any)?.status as number | undefined;
        const permanent = status === 400 || status === 404 || row.attempts + 1 >= 3;
        await finish(row.id, {
          status: permanent ? "failed" : "queued",
          error: message.slice(0, 500),
        });
        if (permanent) result.failed++;
        if (status === 401 || status === 403) {
          cachedToken = null;
          break;
        }
      }
    }
    result.remainingToday = remaining;
  } catch (err) {
    console.error("[outreach] processOutbox failed", err instanceof Error ? err.message : err);
  }
  return result;
}
