import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  businessName?: string;
  upgradeUrl?: string;
}

const RetailerTrialEndedEmail = ({ name, businessName, upgradeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Wigsmi trial has ended. Subscribe to bring your store back.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>Your trial has ended.</Heading>
          <Text style={text}>
            Hi{name ? ` ${name}` : ""}, the free trial for
            {businessName ? ` ${businessName}` : " your store"} has wrapped up. Your
            widget and catalog are paused for now.
          </Text>
          <Text style={text}>
            Pick a plan and we'll republish your wigs automatically — no
            re-uploading, no reconfiguration.
          </Text>
          <Button style={button} href={upgradeUrl ?? "https://wigsmi.com/portal/billing"}>
            Reactivate Wigsmi
          </Button>
          <div style={divider} />
          <Text style={muted}>
            Not ready yet? Your catalog stays safe in your account. Sign back
            in any time.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: RetailerTrialEndedEmail,
  subject: "Your Wigsmi trial has ended",
  displayName: "Retailer · Trial ended",
  previewData: {
    name: "Ayo",
    businessName: "Crown & Coils",
    upgradeUrl: "https://wigsmi.com/portal/billing",
  },
} satisfies TemplateEntry;
