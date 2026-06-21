import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
  Section,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { brand, main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  businessName?: string;
  portalUrl?: string;
}

const RetailerWelcomeEmail = ({ name, businessName, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Wigsmi — your 1-month trial has started.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>Welcome{name ? `, ${name}` : ""}.</Heading>
          <Text style={text}>
            {businessName ? `${businessName} is` : "You're"} all set up on Wigsmi.
            Your 3-month free trial has started — no card needed.
          </Text>
          <Text style={text}>Three quick steps to get live:</Text>
          <Text style={{ ...text, paddingLeft: 12 }}>
            1. Upload your first wig
            <br />
            2. Drop the widget on your product page
            <br />
            3. Watch real customers try them on
          </Text>
          <Button style={button} href={portalUrl ?? "https://wigsmi.com/portal"}>
            Open your portal
          </Button>
          <div style={divider} />
          <Text style={muted}>
            We're here if you need a hand. Just reply to this email.
            <br />— The Wigsmi team
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: RetailerWelcomeEmail,
  subject: "Welcome to Wigsmi — your trial has started",
  displayName: "Retailer · Welcome",
  previewData: {
    name: "Ayo",
    businessName: "Crown & Coils",
    portalUrl: "https://wigsmi.com/portal",
  },
} satisfies TemplateEntry;
