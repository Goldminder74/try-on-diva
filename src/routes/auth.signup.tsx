import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/signup")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  head: () => ({
    meta: [{ property: "og:title", content: "Sign up - Wigsmi" }, { property: "og:description", content: "Manage sign up with Wigsmi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
      { title: "Sign up - Wigsmi" },
      { name: "description", content: "Create your free Wigsmi account in under a minute." },
    ],
  }),
  component: () => (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  ),
});
