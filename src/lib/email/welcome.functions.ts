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

    const { buildWelcomeEmail } = await import("./welcome-payload");
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;

    let businessName: string | null = null;
    if (roles.includes("retailer")) {
      const { data: retailer } = await supabase
        .from("retailers")
        .select("business_name")
        .eq("owner_id", userId)
        .maybeSingle();
      businessName = retailer?.business_name ?? null;
    }
    return serverSendTransactionalEmail(
      buildWelcomeEmail({
        userId,
        email,
        roles,
        displayName: meta.display_name as string | undefined,
        businessName,
        origin: data.origin,
      }),
    );
  });
