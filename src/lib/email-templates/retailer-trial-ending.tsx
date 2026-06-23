import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  businessName?: string;
  trialEndsAt?: string;
  upgradeUrl?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "in 3 days";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

const RetailerTrialEndingEmail = ({ name, businessName, trialEndsAt, upgradeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Wigsmi trial ends soon - pick a plan to keep your store live.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>Your trial ends {formatDate(trialEndsAt)}.</Heading>
          <Text style={text}>
            Hi{name ? ` ${name}` : ""}, {businessName ? `${businessName}'s` : "your"} free trial of
            Wigsmi is almost up. Pick a plan to keep your widget live and your
            customers trying on wigs.
          </Text>
          <Button style={button} href={upgradeUrl ?? "https://wigsmi.com/portal/billing"}>
            Choose a plan
          </Button>
          <div style={divider} />
          <Text style={muted}>
            If you do nothing, your widget and catalog will be paused when the
            trial ends. You can resubscribe any time to bring them back.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: RetailerTrialEndingEmail,
  subject: "Your Wigsmi trial ends in 3 days",
  displayName: "Retailer · Trial ending in 3 days",
  previewData: {
    name: "Ayo",
    businessName: "Crown & Coils",
    trialEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    upgradeUrl: "https://wigsmi.com/portal/billing",
  },
} satisfies TemplateEntry;
