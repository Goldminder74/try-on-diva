import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { RetailerAuthForm } from "@/components/retailer/RetailerAuthForm";

export const Route = createFileRoute("/retailer_/login")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ property: "og:title", content: "Retailer login - Wigsmi" }, { property: "og:description", content: "Sign in to the Wigsmi retailer portal to manage your catalogue and widget." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, 
      { title: "Retailer login - Wigsmi" },
      { name: "description", content: "Log in to your Wigsmi retailer dashboard." },
    ],
  }),
  component: () => (
    <AuthShell>
      <RetailerAuthForm mode="login" />
    </AuthShell>
  ),
});
