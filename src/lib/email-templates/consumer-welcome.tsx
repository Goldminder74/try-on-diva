import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  appUrl?: string;
}

const ConsumerWelcomeEmail = ({ name, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Wigsmi - try on every wig before you buy.</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>Welcome{name ? `, ${name}` : ""}.</Heading>
          <Text style={text}>
            You're in. Wigsmi is the easiest way to try on wigs before you buy
            - built for Black wig buyers, on real hair textures.
          </Text>
          <Text style={text}>Two quick things to do next:</Text>
          <Text style={{ ...text, paddingLeft: 12 }}>
            1. Take the 60-second style quiz so we can recommend wigs that
            suit you.
            <br />
            2. Upload one clear photo of your face - it stays private and is
            only used for try-on.
          </Text>
          <Button style={button} href={appUrl ?? "https://wigsmi.com/app"}>
            Start trying on
          </Button>
          <div style={divider} />
          <Text style={muted}>
            We never sell your photo. You can delete it at any time from your
            profile.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template = {
  component: ConsumerWelcomeEmail,
  subject: "Welcome to Wigsmi",
  displayName: "Consumer · Welcome",
  previewData: { name: "Amara", appUrl: "https://wigsmi.com/app" },
} satisfies TemplateEntry;
