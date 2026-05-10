import React from "react";

/**
 * Template registry. The Lovable Email infrastructure imports this map
 * to render templates by name. Each entry conforms to TemplateEntry.
 *
 * After running scaffold_transactional_email, this file is the source of
 * truth for the send pipeline. Add templates here when adding new ones.
 */

export interface TemplateEntry {
  component: React.ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  to?: string;
  displayName?: string;
  previewData?: Record<string, any>;
}

import { template as retailerWelcome } from "./retailer-welcome";
import { template as retailerTrialEnding } from "./retailer-trial-ending";
import { template as retailerTrialEnded } from "./retailer-trial-ended";
import { template as retailerSubscribed } from "./retailer-subscribed";
import { template as retailerPaymentFailed } from "./retailer-payment-failed";
import { template as consumerWelcome } from "./consumer-welcome";

export const TEMPLATES: Record<string, TemplateEntry> = {
  "retailer-welcome": retailerWelcome,
  "retailer-trial-ending": retailerTrialEnding,
  "retailer-trial-ended": retailerTrialEnded,
  "retailer-subscribed": retailerSubscribed,
  "retailer-payment-failed": retailerPaymentFailed,
  "consumer-welcome": consumerWelcome,
};
