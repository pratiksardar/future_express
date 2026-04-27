/**
 * The Future Express — Welcome email.
 *
 * Sent once, immediately after a successful subscribe. Two short paragraphs:
 *   1. Confirmation + next-dispatch promise.
 *   2. The subscriber's referral code + share URL + reward hook.
 *
 * Same broadsheet hard rules as the daily digest:
 *   - Display serif headlines, body serif copy.
 *   - NO ASCII art, NO box-drawing, NO monospace.
 *   - Inline styles only — Outlook does not honor <style> blocks.
 *   - No emoji (Pro tier hook is plain prose).
 */
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Hr,
} from "@react-email/components";

const COLOR = {
  paperCream: "#f5efe1",
  paperWarm: "#efe6d2",
  ink: "#1c1a16",
  inkMedium: "#4a4338",
  rule: "#cdbf9a",
  accentGold: "#b48a3c",
  accentBlue: "#2e4a6b",
} as const;

const SERIF_DISPLAY =
  "'Playfair Display', 'Times New Roman', Georgia, serif";
const SERIF_BODY = "Georgia, 'Times New Roman', serif";
const SANS_UI =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface WelcomeContent {
  /** Absolute base URL of the site, e.g. https://thefutureexpress.com */
  baseUrl: string;
  /** Subscriber's 8-char referral code. */
  referralCode: string;
  /** Subscriber's per-recipient unsubscribe token. */
  unsubscribeToken: string;
  /**
   * Approximate hour (0-23) the next dispatch will arrive. Defaults to 7.
   * We include this in copy so the welcome email is informative, not generic.
   */
  preferredSendHour?: number;
}

function shareUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
}

function unsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/unsubscribe?token=${token}`;
}

export function WelcomeEmail(props: WelcomeContent): React.ReactElement {
  const { baseUrl, referralCode, unsubscribeToken, preferredSendHour } = props;
  const hour = preferredSendHour ?? 7;
  const hourLabel = (() => {
    if (hour === 0) return "midnight";
    if (hour === 12) return "noon";
    if (hour < 12) return `${hour} of the morning`;
    return `${hour - 12} of the afternoon`;
  })();
  const link = shareUrl(baseUrl, referralCode);

  return (
    <Html>
      <Head />
      <Preview>Welcome aboard. The next dispatch arrives at dawn.</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLOR.paperWarm,
          fontFamily: SERIF_BODY,
          color: COLOR.ink,
        }}
      >
        <Container
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            backgroundColor: COLOR.paperCream,
            border: `1px solid ${COLOR.rule}`,
          }}
        >
          {/* Masthead */}
          <Section
            style={{
              textAlign: "center",
              padding: "32px 16px 16px",
              borderBottom: `3px double ${COLOR.accentGold}`,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontFamily: SANS_UI,
                fontSize: "10px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: COLOR.inkMedium,
              }}
            >
              A Note from the Editor
            </Text>
            <Heading
              as="h1"
              style={{
                margin: "8px 0 4px",
                fontFamily: SERIF_DISPLAY,
                fontSize: "40px",
                fontWeight: 900,
                letterSpacing: "0.01em",
                color: COLOR.ink,
                lineHeight: 1.1,
              }}
            >
              <Link
                href={baseUrl}
                style={{ color: COLOR.ink, textDecoration: "none" }}
              >
                The Future Express
              </Link>
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "28px 28px 8px" }}>
            <Text
              style={{
                margin: "0 0 18px",
                fontFamily: SERIF_BODY,
                fontSize: "17px",
                lineHeight: 1.55,
                color: COLOR.ink,
              }}
            >
              Welcome. You will receive your next dispatch tomorrow at {hourLabel},
              your local time. The Future Express prints what the prediction
              markets believe will happen next, set in plain prose, free from
              cant.
            </Text>
            <Text
              style={{
                margin: "0 0 6px",
                fontFamily: SERIF_BODY,
                fontSize: "17px",
                lineHeight: 1.55,
                color: COLOR.ink,
              }}
            >
              Your referral code is{" "}
              <span
                style={{
                  fontFamily: SERIF_DISPLAY,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  color: COLOR.ink,
                }}
              >
                {referralCode}
              </span>
              . Share{" "}
              <Link
                href={link}
                style={{
                  color: COLOR.accentBlue,
                  textDecoration: "underline",
                  fontWeight: 700,
                }}
              >
                {link}
              </Link>
              {" "}— invite three friends and earn a free month of Pro when it
              launches.
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              padding: "16px 24px 24px",
              textAlign: "center",
              borderTop: `3px double ${COLOR.accentGold}`,
              marginTop: "16px",
            }}
          >
            <Hr
              style={{
                margin: "0 0 12px",
                borderColor: COLOR.rule,
                borderTop: `1px solid ${COLOR.rule}`,
                borderBottom: 0,
              }}
            />
            <Text
              style={{
                margin: 0,
                fontFamily: SERIF_BODY,
                fontStyle: "italic",
                fontSize: "13px",
                color: COLOR.inkMedium,
              }}
            >
              Printed by a machine that has read more newspapers than you.
            </Text>
            <Text
              style={{
                margin: "12px 0 0",
                fontFamily: SANS_UI,
                fontSize: "11px",
                color: COLOR.inkMedium,
              }}
            >
              <Link
                href={baseUrl}
                style={{ color: COLOR.inkMedium, textDecoration: "underline" }}
              >
                thefutureexpress.com
              </Link>
              {" · "}
              <Link
                href={unsubscribeUrl(baseUrl, unsubscribeToken)}
                style={{ color: COLOR.inkMedium, textDecoration: "underline" }}
              >
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
