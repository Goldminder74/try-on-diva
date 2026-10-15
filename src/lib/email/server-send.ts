/**
 * Server-side app email helper (server routes / server functions only).
 * Sends a registered template through Lovable's managed email API and
 * records the outcome in email_send_log. Never throws.
 * Sends are idempotent on idempotencyKey - safe to retry.
 */
import { createClient } from "@supabase/supabase-js";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

interface ServerSendParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  /** Kept for call-site compatibility; unused. */
  baseUrl?: string;
}

async function logSend(row: {
  template_name: string;
  recipient_email: string;
  status: "sent" | "suppressed" | "failed";
  error_message?: string;
}) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb.from("email_send_log").insert({ message_id: null, ...row });
    if (error) console.error("[email] send log insert failed", { code: error.code, message: error.message });
  } catch (err) {
    console.error("[email] send log insert threw", err);
  }
}

export async function serverSendTransactionalEmail(params: ServerSendParams) {
  try {
    const result = await sendTemplateEmail(params.templateName, params.recipientEmail, {
      templateData: params.templateData as Record<string, any> | undefined,
      idempotencyKey: params.idempotencyKey,
    });
    if (result.sent) {
      await logSend({ template_name: params.templateName, recipient_email: params.recipientEmail, status: "sent" });
      return { ok: true as const };
    }
    await logSend({ template_name: params.templateName, recipient_email: params.recipientEmail, status: "suppressed" });
    // Suppressed is a final outcome - don't retry.
    return { ok: true as const, suppressed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] send ${params.templateName} failed:`, message);
    await logSend({
      template_name: params.templateName,
      recipient_email: params.recipientEmail,
      status: "failed",
      error_message: message,
    });
    return { ok: false as const };
  }
}
