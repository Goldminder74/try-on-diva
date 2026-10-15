import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";

// Send a welcome email once per user - keyed by user id so multiple logins
// don't trigger duplicates; the send is also idempotent server-side.
async function maybeSendWelcome(session: { user: { id: string } }) {
  try {
    const key = `wigsmi:welcomed:${session.user.id}`;
    if (typeof window !== "undefined" && window.localStorage?.getItem(key)) return;
    await sendWelcomeEmail({ data: { origin: window.location.origin } });
    if (typeof window !== "undefined") window.localStorage.setItem(key, "1");
  } catch (err) {
    // Welcome email is non-critical - never block login on send failures.
    console.warn("[welcome-email] skipped:", err);
  }
}

function safeRedirect(r: string | null | undefined, fallback: string): string {
  if (!r) return fallback;
  if (!r.startsWith("/") || r.startsWith("//")) return fallback;
  return r;
}

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const stashed =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("wigsmi:postAuthRedirect")
        : null;
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("wigsmi:postAuthRedirect");
    }
    const t = setTimeout(() => {
      supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) {
          navigate({ to: "/auth/login" });
          return;
        }
        void maybeSendWelcome(data.session as never);

        // Role-aware default destination: retailers go to /portal, everyone
        // else to /app. An explicit ?next= or stashed redirect always wins
        // (so /portal/billing?plan=... resume works).
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id);
        const isRetailer = (roles ?? []).some((r) => r.role === "retailer");
        const fallback = isRetailer ? "/portal" : "/app";
        const target = safeRedirect(next ?? stashed, fallback);
        navigate({ to: target as "/app" });
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
