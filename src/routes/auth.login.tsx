import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/login")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  head: () => ({
    meta: [{ property: "og:title", content: "Log in - Wigsmi" }, { property: "og:description", content: "Log in to Wigsmi to try on wigs, view your history and saved styles." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
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
