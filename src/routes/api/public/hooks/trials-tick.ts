import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { serverSendTransactionalEmail } from "@/lib/email/server-send";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function recordEvent(retailerId: string, eventType: string) {
  const sb = getSupabase();
  const { error } = await sb
    .from("retailer_lifecycle_events")
    .insert({ retailer_id: retailerId, event_type: eventType });
  // Unique-violation = already recorded → don't double-send.
  if (error && (error.code === "23505" || /duplicate/i.test(error.message ?? ""))) {
    return false;
  }
  if (error) {
    console.error("[trials-tick] lifecycle insert failed:", error);
    return false;
  }
  return true;
}

async function hasActiveSub(userId: string): Promise<boolean> {
  if (!userId) return false;
  const sb = getSupabase();
  const { data } = await sb
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export const Route = createFileRoute("/api/public/hooks/trials-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Only callable by pg_cron / trusted schedulers that present the
        // Supabase publishable key in the apikey header. Public callers 401.
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? request.headers.get("x-cron-key");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const sb = getSupabase();
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const now = new Date();
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        // --- 1) Trial ending in 3 days reminder ---
        const { data: endingSoon } = await sb
          .from("retailers")
          .select("id, owner_id, business_name, display_name, trial_ends_at, is_active")
          .eq("is_active", true)
          .gt("trial_ends_at", now.toISOString())
          .lt("trial_ends_at", in3Days.toISOString());

        let endingSoonSent = 0;
        for (const r of endingSoon ?? []) {
          if (await hasActiveSub(r.owner_id)) continue;
          const ok = await recordEvent(r.id, "trial_ending_3d");
          if (!ok) continue;
          const { data: profile } = await sb
            .from("profiles")
            .select("email, display_name")
            .eq("id", r.owner_id)
            .maybeSingle();
          if (!profile?.email) continue;
          await serverSendTransactionalEmail({
            baseUrl,
            templateName: "retailer-trial-ending",
            recipientEmail: profile.email,
            idempotencyKey: `trial-ending-${r.id}`,
            templateData: {
              name: profile.display_name ?? r.display_name ?? r.business_name,
              businessName: r.business_name,
              trialEndsAt: r.trial_ends_at,
              upgradeUrl: `${baseUrl}/portal/billing`,
            },
          });
          endingSoonSent++;
        }

        // --- 2) Trial expired → hard lock ---
        const { data: expired } = await sb
          .from("retailers")
          .select("id, owner_id, business_name, display_name, trial_ends_at, is_active")
          .eq("is_active", true)
          .lt("trial_ends_at", now.toISOString());

        let lockedCount = 0;
        for (const r of expired ?? []) {
          if (await hasActiveSub(r.owner_id)) continue;

          // Suspend the retailer (hides from public reads via RLS).
          await sb
            .from("retailers")
            .update({ is_active: false, updated_at: now.toISOString() })
            .eq("id", r.id);

          // Auto-unpublish all currently published wigs; record marker so
          // we know which to republish on subscription.
          await sb
            .from("wigs")
            .update({
              is_published: false,
              auto_unpublished_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("retailer_id", r.id)
            .eq("is_published", true);

          // Analytics breadcrumb.
          await sb.from("analytics_events").insert({
            retailer_id: r.id,
            event_type: "trial_expired",
            payload: { trial_ends_at: r.trial_ends_at },
          });

          const inserted = await recordEvent(r.id, "trial_ended");
          if (inserted) {
            const { data: profile } = await sb
              .from("profiles")
              .select("email, display_name")
              .eq("id", r.owner_id)
              .maybeSingle();
            if (profile?.email) {
              await serverSendTransactionalEmail({
                baseUrl,
                templateName: "retailer-trial-ended",
                recipientEmail: profile.email,
                idempotencyKey: `trial-ended-${r.id}`,
                templateData: {
                  name: profile.display_name ?? r.display_name ?? r.business_name,
                  businessName: r.business_name,
                  upgradeUrl: `${baseUrl}/portal/billing`,
                },
              });
            }
          }
          lockedCount++;
        }

        return Response.json({
          ok: true,
          ending_soon_sent: endingSoonSent,
          locked: lockedCount,
        });
      },
    },
  },
});
