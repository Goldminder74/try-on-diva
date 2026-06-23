import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password - Wigsmi" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Route by role: retailers go to /portal, consumers to /app.
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    let isRetailer = false;
    if (uid) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      isRetailer = (roles ?? []).some((r) => r.role === "retailer");
    }
    setBusy(false);
    navigate({ to: isRetailer ? "/portal" : "/app" });
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Reset password</p>
        <h1 className="mt-1 font-display text-4xl text-mahogany">Set a new password.</h1>
        <p className="mt-3 text-sm text-muted-foreground">Choose at least 8 characters.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20"
          />
          {error && <p className="text-sm text-error">{error}</p>}
          {!ready && <p className="text-xs text-muted-foreground">Verifying your reset link…</p>}
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
