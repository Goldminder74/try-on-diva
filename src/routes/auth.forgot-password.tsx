import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — Wigsmi" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Reset password</p>
        <h1 className="mt-1 font-display text-4xl text-mahogany">Forgot your password?</h1>
        <p className="mt-3 text-sm text-muted-foreground">We'll email you a link to set a new one.</p>

        {sent ? (
          <p className="mt-6 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold-dark">
            If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link to="/auth/login" className="mt-6 block text-xs text-muted-foreground hover:text-mahogany">
          ← Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
