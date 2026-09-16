import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wigsmi/Wordmark";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe | Wigsmi" },
      {
        name: "description",
        content: "Unsubscribe from Wigsmi emails in one click.",
      },
      { property: "og:title", content: "Unsubscribe | Wigsmi" },
      {
        property: "og:description",
        content: "Unsubscribe from Wigsmi emails in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type State = "loading" | "ready" | "done" | "error";

function UnsubscribePage() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) {
      setState("error");
      setMessage("This unsubscribe link is missing its code.");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (res) => {
        if (res.ok) {
          setState("ready");
        } else {
          setState("error");
          setMessage("This unsubscribe link is invalid or has already been used.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("We couldn't check that link. Please try again.");
      });
  }, []);

  async function confirm() {
    if (!token) return;
    setState("loading");
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
        setMessage("We couldn't complete that. Please try again.");
      }
    } catch {
      setState("error");
      setMessage("We couldn't complete that. Please try again.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <Wordmark />
        {state === "loading" && (
          <p className="mt-6 font-mono text-xs uppercase tracking-wider text-gold-dark">
            One moment…
          </p>
        )}
        {state === "ready" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-mahogany">
              Unsubscribe from Wigsmi emails?
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              You'll stop receiving marketing and notification emails from us.
            </p>
            <Button className="mt-6 w-full" onClick={confirm}>
              Confirm unsubscribe
            </Button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-mahogany">
              You're unsubscribed.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We won't email you again. You can always resubscribe from your
              account settings.
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="mt-6 font-display text-2xl text-mahogany">
              Something's off.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </main>
  );
}
