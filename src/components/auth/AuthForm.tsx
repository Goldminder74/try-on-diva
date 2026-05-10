import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { display_name: name || email.split("@")[0], role: "consumer" },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) {
        setError(result.error.message ?? "Google sign-in failed.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </p>
      <h1 className="mt-1 font-display text-4xl text-mahogany">
        {mode === "login" ? "Log in to Wigsmi." : "Join Wigsmi."}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "login"
          ? "Pick up where you left off."
          : "Try wigs on, save favourites, get personalised picks."}
      </p>

      <button
        onClick={onGoogle}
        disabled={busy}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:border-mahogany disabled:opacity-50"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={inputCls}
              placeholder="What should we call you?"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputCls}
            placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
          />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}
        {info && <p className="rounded-md border border-gold/30 bg-gold/10 p-3 text-sm text-gold-dark">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link to="/auth/forgot-password" className="hover:text-mahogany">Forgot password?</Link>
            <Link to="/auth/signup" className="hover:text-mahogany">Create an account</Link>
          </>
        ) : (
          <Link to="/auth/login" className="hover:text-mahogany">Already have an account? Log in</Link>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20";

function Field({ label, children }: { label: string; children: ReactNodeLike }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-gold-dark">{label}</span>
      {children}
    </label>
  );
}

type ReactNodeLike = React.ReactNode;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.65 9c0-.59.1-1.17.3-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  );
}
