/** Decides which welcome email a newly signed-in user gets. */
export function buildWelcomeEmail(input: {
  userId: string;
  email: string;
  roles: string[];
  displayName?: string;
  businessName?: string | null;
  origin: string;
}) {
  const name = input.displayName ?? input.email.split("@")[0];
  if (input.roles.includes("retailer")) {
    return {
      templateName: "retailer-welcome",
      recipientEmail: input.email,
      idempotencyKey: `retailer-welcome-${input.userId}`,
      templateData: { name, businessName: input.businessName ?? undefined, portalUrl: `${input.origin}/portal` },
    };
  }
  return {
    templateName: "consumer-welcome",
    recipientEmail: input.email,
    idempotencyKey: `consumer-welcome-${input.userId}`,
    templateData: { name, appUrl: `${input.origin}/app` },
  };
}
