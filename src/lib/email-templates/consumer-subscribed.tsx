import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  plan?: string;
  appUrl?: string;
}

const planLabel = (plan?: string) =>
  plan === "pro" ? "Pro" : plan === "plus" ? "Plus" : "your new plan";

const ConsumerSubscribedEmail = ({ name, plan, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Wigsmi subscription is active.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>You're on {planLabel(plan)}.</Heading>
          <Text style={text}>
            Hi{name ? ` ${name}` : ""}, your Wigsmi subscription is active.
            Unlimited try-ons are unlocked, so upload a selfie and see yourself
            in as many styles as you like.
          </Text>
          {plan === "pro" ? (
            <Text style={text}>
              As a Pro member your downloads come without the Wigsmi watermark,
              your saved looks are kept for good, and your try-ons run on our
              highest quality setting.
            </Text>
          ) : null}
          <Button style={button} href={appUrl ?? "https://wigsmi.com/app/try-on"}>
            Start a try-on
          </Button>
          <div style={divider} />
          <Text style={muted}>
            You can view invoices or cancel any time from your account. Reply to
            this email if you need a hand.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: ConsumerSubscribedEmail,
  subject: "Your Wigsmi subscription is active",
  displayName: "Consumer · Subscribed",
  previewData: {
    name: "Ada",
    plan: "pro",
    appUrl: "https://wigsmi.com/app/try-on",
  },
} satisfies TemplateEntry;
