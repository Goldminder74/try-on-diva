import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in - Wigsmi" },
      { name: "description", content: "Log in to try wigs on, save favourites and get personalised picks." },
    ],
  }),
  component: () => (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  ),
});
