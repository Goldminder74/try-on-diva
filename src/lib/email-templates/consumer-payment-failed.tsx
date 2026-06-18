import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  billingUrl?: string;
}

const ConsumerPaymentFailedEmail = ({ name, billingUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We couldn't process your latest Wigsmi payment.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>Payment didn't go through.</Heading>
          <Text style={text}>
            Hi{name ? ` ${name}` : ""}, we tried to charge your card for your
            Wigsmi subscription and it was declined.
          </Text>
          <Text style={text}>
            We'll retry over the next few days. To avoid losing unlimited
            try-ons, please update your billing details now.
          </Text>
          <Button style={button} href={billingUrl ?? "https://wigsmi.com/pricing"}>
            Update billing
          </Button>
          <div style={divider} />
          <Text style={muted}>
            If you think this is a mistake, reply to this email and we'll take
            a look.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: ConsumerPaymentFailedEmail,
  subject: "Action needed: Wigsmi payment failed",
  displayName: "Consumer · Payment failed",
  previewData: {
    name: "Ada",
    billingUrl: "https://wigsmi.com/pricing",
  },
} satisfies TemplateEntry;
