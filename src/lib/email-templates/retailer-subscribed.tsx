import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  businessName?: string;
  plan?: string;
  portalUrl?: string;
}

const RetailerSubscribedEmail = ({ name, businessName, plan, portalUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're live on Wigsmi.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>You're live{name ? `, ${name}` : ""}.</Heading>
          <Text style={text}>
            {businessName ? `${businessName} is` : "Your store is"} fully active on
            Wigsmi{plan ? ` on the ${plan} plan` : ""}. Your wigs are republished
            and your widget is back online.
          </Text>
          <Button style={button} href={portalUrl ?? "https://wigsmi.com/portal"}>
            Open your portal
          </Button>
          <div style={divider} />
          <Text style={muted}>
            Need to change your plan or update billing? You can do it any time
            from your portal billing page.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: RetailerSubscribedEmail,
  subject: "You're live on Wigsmi",
  displayName: "Retailer · Subscribed",
  previewData: {
    name: "Ayo",
    businessName: "Crown & Coils",
    plan: "Growth",
    portalUrl: "https://wigsmi.com/portal",
  },
} satisfies TemplateEntry;
