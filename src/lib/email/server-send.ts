/**
 * Server-side transactional email helper.
 *
 * Used from cron routes and webhooks where there is no end-user session.
 * Calls the same /lovable/email/transactional/send endpoint as the client
 * helper but does not attach a Supabase auth header (the queue dispatcher
 * authenticates internally).
 *
 * Sends are idempotent on idempotencyKey — safe to retry.
 */
interface ServerSendParams {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  baseUrl: string;
}

export async function serverSendTransactionalEmail(params: ServerSendParams) {
  try {
    const response = await fetch(`${params.baseUrl}/lovable/email/transactional/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: params.templateName,
        recipientEmail: params.recipientEmail,
        idempotencyKey: params.idempotencyKey,
        templateData: params.templateData,
      }),
    });
    if (!response.ok) {
      console.error(
        `[email] send ${params.templateName} -> ${params.recipientEmail} failed:`,
        response.status,
        response.statusText,
      );
      return { ok: false as const };
    }
    return { ok: true as const };
  } catch (err) {
    console.error(`[email] send ${params.templateName} threw:`, err);
    return { ok: false as const };
  }
}
