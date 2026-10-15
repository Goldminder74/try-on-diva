import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends the signed-in user's welcome email (retailer or consumer). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { origin: string }) => {
    if (!d || typeof d.origin !== "string" || !/^https?:\/\//.test(d.origin)) {
      throw new Error("Invalid origin");
    }
    return { origin: d.origin.replace(/\/+$/, "") };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as any;
    const email = (claims?.email as string | undefined) ?? null;
    if (!email) return { ok: false };
    const { serverSendTransactionalEmail } = await import("./server-send");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isRetailer = (roles ?? []).some((r: { role: string }) => r.role === "retailer");
    const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
    const displayName = (meta.display_name as string | undefined) ?? email.split("@")[0];

    if (isRetailer) {
      const { data: retailer } = await supabase
        .from("retailers")
        .select("business_name")
        .eq("owner_id", userId)
        .maybeSingle();
      return serverSendTransactionalEmail({
        templateName: "retailer-welcome",
        recipientEmail: email,
        idempotencyKey: `retailer-welcome-${userId}`,
        templateData: { name: displayName, businessName: retailer?.business_name, portalUrl: `${data.origin}/portal` },
      });
    }
    return serverSendTransactionalEmail({
      templateName: "consumer-welcome",
      recipientEmail: email,
      idempotencyKey: `consumer-welcome-${userId}`,
      templateData: { name: displayName, appUrl: `${data.origin}/app` },
    });
  });
