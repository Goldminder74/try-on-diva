import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

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
