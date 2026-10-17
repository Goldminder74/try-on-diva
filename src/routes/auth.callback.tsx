import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";
import { resolveCallback } from "@/lib/auth-callback";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
  head: () => ({
    meta: [
      { title: "Signing in | Wigsmi" },
      { name: "description", content: "Complete your Wigsmi sign-in and return to your account." },
      { property: "og:title", content: "Signing in | Wigsmi" },
      { property: "og:description", content: "Complete your Wigsmi sign-in and return to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      void resolveCallback(window.location.search, {
        getSession: async () => (await supabase.auth.getSession()).data.session,
        getRoles: async (userId) => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          return (data ?? []).map((r) => r.role as string);
        },
        sendWelcome: () => sendWelcomeEmail({ data: { origin: window.location.origin } }),
        local: window.localStorage,
        session: window.sessionStorage,
      }).then((target) => navigate({ to: target as "/app" }));
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
