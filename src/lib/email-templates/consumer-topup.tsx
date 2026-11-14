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
import { main, outer, container, h1, text, muted, button, divider, Wordmark } from "./_styles";

interface Props {
  name?: string;
  credits?: number;
  priceGbp?: number;
  expiresOn?: string;
  appUrl?: string;
}

const ConsumerTopUpEmail = ({ name, credits, priceGbp, expiresOn, appUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${credits ?? 10} extra try-ons are on your account.`}</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={container}>
          <Wordmark />
          <Heading style={h1}>{credits ?? 10} more try-ons, added.</Heading>
          <Text style={text}>
            Hi{name ? ` ${name}` : ""}, thanks for your{" "}
            {typeof priceGbp === "number" ? `£${priceGbp.toFixed(2)}` : "£2.99"}
            payment. We've added {credits ?? 10} try-ons to your account on top of whatever your
            plan already gives you each month.
          </Text>
          <Text style={text}>
            Your monthly allowance is always used first, so these extras are waiting for whenever
            you need them{expiresOn ? ` - until ${expiresOn}` : ""}.
          </Text>
          <Button style={button} href={appUrl ?? "https://wigsmi.com/app/try-on"}>
            Use them now
          </Button>
          <div style={divider} />
          <Text style={muted}>
            This was a one-off purchase: no subscription, no renewal, no card charged again.
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: ConsumerTopUpEmail,
  subject: () => "Your extra try-ons are ready",
  previewData: {
    name: "Amara",
    credits: 10,
    priceGbp: 2.99,
    expiresOn: "1 November 2027",
    appUrl: "https://wigsmi.com/app/try-on",
  },
};
