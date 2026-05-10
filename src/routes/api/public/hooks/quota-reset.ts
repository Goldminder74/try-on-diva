import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

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

export const Route = createFileRoute("/api/public/hooks/quota-reset")({
  server: {
    handlers: {
      POST: async () => {
        const sb = getSupabase();
        // Reset try-on quotas for consumers whose month_reset is stale.
        const { data, error } = await sb.rpc("reset_stale_try_on_quotas");
        if (error) {
          // Fallback inline update if the RPC isn't installed.
          const { data: rows, error: updErr } = await sb
            .from("consumer_profiles")
            .update({
              try_on_count_this_month: 0,
              try_on_month_reset: new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1,
              )
                .toISOString()
                .slice(0, 10),
            })
            .lt(
              "try_on_month_reset",
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1,
              )
                .toISOString()
                .slice(0, 10),
            )
            .select("user_id");
          if (updErr) {
            console.error("[quota-reset] update failed:", updErr);
            return new Response(JSON.stringify({ ok: false }), { status: 500 });
          }
          return Response.json({ ok: true, reset: rows?.length ?? 0 });
        }
        return Response.json({ ok: true, reset: data ?? 0 });
      },
    },
  },
});
