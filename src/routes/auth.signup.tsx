import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Wigsmi" },
      { name: "description", content: "Create your free Wigsmi account in under a minute." },
    ],
  }),
  component: () => (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  ),
});
