import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    // Session is set by the lovable.auth helper or by Supabase's auto handler.
    const t = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        navigate({ to: data.session ? "/app" : "/auth/login" });
      });
    }, 200);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Signing you in…</p>
    </div>
  );
}
