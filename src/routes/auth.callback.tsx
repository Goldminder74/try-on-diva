import { storedUtm } from "@/lib/utm";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendWelcomeEmail } from "@/lib/email/welcome.functions";
import { resolveCallback } from "@/lib/auth-callback";

export const Route = createFileRoute("/auth/callback")({
  staticData: { sitemap: false },
  component: Callback,
  head: () => ({
    meta: [
      { title: "Signing in | Wigsmi" },
      { name: "description", content: "Complete your Wigsmi sign-in and return to your account." },
      { property: "og:title", content: "Signing in | Wigsmi" },
      {
        property: "og:description",
        content: "Complete your Wigsmi sign-in and return to your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Google sign-ups carry no sign-up metadata: copy first-visit tags onto a brand-new profile. */
async function saveSignupUtm(userId: string) {
  try {
    const utm = storedUtm();
    if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return;
    const since = new Date(Date.now() - 86400000).toISOString();
    await supabase
      .from("profiles")
      .update(utm)
      .eq("id", userId)
      .is("utm_source", null)
      .is("utm_medium", null)
      .is("utm_campaign", null)
      .gte("created_at", since);
  } catch {
    /* never block sign-in */
  }
}

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      void resolveCallback(window.location.search, {
        getSession: async () => (await supabase.auth.getSession()).data.session,
        getRoles: async (userId) => {
          void saveSignupUtm(userId);
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
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Signing you in…</p>
    </div>
  );
}
