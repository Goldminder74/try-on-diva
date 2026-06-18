import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "signup";

export function RetailerAuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [business, setBusiness] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Resume plan selection after signup/login: if the user arrived from
  // /retailer with ?plan=&interval=, send them back to /portal/billing with
  // the same params so checkout opens automatically.
  const getPostAuthRedirect = (): string => {
    if (typeof window === "undefined") return "/portal";
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    const interval = params.get("interval");
    if (plan) {
      const qp = new URLSearchParams({ plan });
      if (interval) qp.set("interval", interval);
      return `/portal/billing?${qp.toString()}`;
    }
    return "/portal";
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const redirectPath = getPostAuthRedirect();
      if (mode === "signup") {
        // Stash for the post-confirmation callback path too.
        try {
          sessionStorage.setItem("wigsmi:postAuthRedirect", redirectPath);
        } catch { /* ignore */ }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
            data: {
              display_name: business || email.split("@")[0],
              role: "retailer",
            },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm, then log in to finish onboarding.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(redirectPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
        {mode === "login" ? "Retailer login" : "Retailer signup"}
      </p>
      <h1 className="mt-1 font-display text-4xl text-mahogany">
        {mode === "login" ? "Welcome back." : "Sell more wigs."}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "login"
          ? "Log in to your retailer dashboard."
          : "Free 3-month trial. No card required."}
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-3">
        {mode === "signup" && (
          <Field label="Business name">
            <input
              required
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className={inputCls}
              placeholder="e.g. Sienna Hair Co."
            />
          </Field>
        )}
        <Field label="Work email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
            placeholder="you@yourshop.com"
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
        {info && (
          <p className="rounded-md border border-gold/30 bg-gold/10 p-3 text-sm text-gold-dark">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Start free trial"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            <Link to="/auth/forgot-password" className="hover:text-mahogany">
              Forgot password?
            </Link>
            <Link to="/retailer/signup" className="hover:text-mahogany">
              Create retailer account
            </Link>
          </>
        ) : (
          <Link to="/retailer/login" className="hover:text-mahogany">
            Already have an account? Log in
          </Link>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-mahogany focus:outline-none focus:ring-2 focus:ring-mahogany/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-gold-dark">
        {label}
      </span>
      {children}
    </label>
  );
}
