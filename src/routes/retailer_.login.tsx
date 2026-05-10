import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { RetailerAuthForm } from "@/components/retailer/RetailerAuthForm";

export const Route = createFileRoute("/retailer_/login")({
  head: () => ({
    meta: [
      { title: "Retailer login — Wigsmi" },
      { name: "description", content: "Log in to your Wigsmi retailer dashboard." },
    ],
  }),
  component: () => (
    <AuthShell>
      <RetailerAuthForm mode="login" />
    </AuthShell>
  ),
});
