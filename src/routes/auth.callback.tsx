import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

// Send a welcome email once per user — keyed by user id so multiple logins
// don't trigger duplicates. localStorage is enough here: the email queue
// is itself idempotent on idempotencyKey, so even if this races, the
// recipient gets one email.
async function maybeSendWelcome(session: { user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } }) {
  try {
    const userId = session.user.id;
    const key = `wigsmi:welcomed:${userId}`;
    if (typeof window !== "undefined" && window.localStorage?.getItem(key)) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isRetailer = (roles ?? []).some((r) => r.role === "retailer");

    const email = session.user.email;
    if (!email) return;
    const displayName =
      (session.user.user_metadata?.display_name as string | undefined) ??
      email.split("@")[0];

    if (isRetailer) {
      const { data: retailer } = await supabase
        .from("retailers")
        .select("business_name")
        .eq("owner_id", userId)
        .maybeSingle();
      await sendTransactionalEmail({
        templateName: "retailer-welcome",
        recipientEmail: email,
        idempotencyKey: `retailer-welcome-${userId}`,
        templateData: {
          name: displayName,
          businessName: retailer?.business_name,
          portalUrl: `${window.location.origin}/portal`,
        },
      });
    } else {
      await sendTransactionalEmail({
        templateName: "consumer-welcome",
        recipientEmail: email,
        idempotencyKey: `consumer-welcome-${userId}`,
        templateData: {
          name: displayName,
          appUrl: `${window.location.origin}/app`,
        },
      });
    }
    if (typeof window !== "undefined") window.localStorage.setItem(key, "1");
  } catch (err) {
    // Welcome email is non-critical — never block login on send failures.
    console.warn("[welcome-email] skipped:", err);
  }
}

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          navigate({ to: "/auth/login" });
          return;
        }
        // Fire-and-forget welcome (won't delay redirect).
        void maybeSendWelcome(data.session as never);
        navigate({ to: (next as "/app") || "/app" });
      });
    }, 200);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
        Signing you in…
      </p>
    </div>
  );
}
