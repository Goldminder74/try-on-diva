import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { RetailerAuthForm } from "@/components/retailer/RetailerAuthForm";

export const Route = createFileRoute("/retailer_/signup")({
  head: () => ({
    meta: [
      { title: "Become a Wigsmi retailer — Free 1-month trial" },
      {
        name: "description",
        content:
          "Add the virtual try-on built for Black wig buyers to your store. Free 1-month trial.",
      },
    ],
  }),
  component: () => (
    <AuthShell>
      <RetailerAuthForm mode="signup" />
    </AuthShell>
  ),
});
