/**
 * The Future Express — Daily Digest email template.
 *
 * Hard rules (per LAUNCH.md surface-aware split):
 *   - Broadsheet typography ONLY — display serif headlines, body serif copy.
 *   - NO ASCII art, NO box-drawing, NO monospace. Email clients (Gmail/Outlook)
 *     strip mono fonts and break Unicode line-art.
 *   - Inline styles only — Outlook does not honor <style> blocks reliably.
 *   - Table-based layout for desktop Outlook compatibility.
 *
 * The palette is the same warm cream / ink medium / gold rule / red kicker the
 * web newspaper uses, but expressed as raw hex values (CSS variables don't
 * survive most mail clients).
 */
import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Heading,
  Link,
  Hr,
  Button,
} from "@react-email/components";

// ── Palette (hex literals — must NOT use CSS variables in email) ──────────
const COLOR = {
  paperCream: "#f5efe1",
  paperWarm: "#efe6d2",
  ink: "#1c1a16",
  inkMedium: "#4a4338",
  rule: "#cdbf9a",
  ruleSoft: "#e0d6bb",
  accentGold: "#b48a3c",
  accentRed: "#a8321c",
  accentBlue: "#2e4a6b",
  spotGreen: "#3f6b3a",
} as const;

// ── Type-only contract — sender constructs this and passes it in ──────────
export interface DigestStory {
  headline: string;
  dek: string | null;
  slug: string;
  category: string;
  /** 0–100 integer probability at publish. */
  probability: number | null;
}

export interface DigestChallenge {
  /** Today's challenge headline / hook copy (broadsheet voice, no emoji). */
  headline: string;
  marketCount: number;
  /** Absolute URL to the challenge page. */
  url: string;
}

export interface DigestContent {
  /** Vol. number for masthead. */
  volume: number;
  /** Edition number within the volume (Roman numerals are computed at render). */
  editionNumber: number;
  /** Human-readable dispatch date, e.g. "Sunday, the 26th of April, 2026". */
  dispatchDate: string;
  /** Top story (first in the list). */
  topStory: DigestStory;
  /** Secondary stories — typically 3–4. */
  secondaryStories: DigestStory[];
  /** Optional daily challenge teaser. */
  challenge: DigestChallenge | null;
  /** Absolute base URL of the site, used for "Read more" + masthead link. */
  baseUrl: string;
  /** Per-recipient unsubscribe token (NOT the subscriber id). */
  unsubscribeToken: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const SERIF_DISPLAY =
  "'Playfair Display', 'Times New Roman', Georgia, serif";
const SERIF_BODY = "Georgia, 'Times New Roman', serif";
const SANS_UI =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function probabilityLabel(p: number | null): { text: string; color: string } {
  if (p === null) return { text: "Unresolved", color: COLOR.inkMedium };
  if (p >= 80) return { text: `${p}% Highly Likely`, color: COLOR.spotGreen };
  if (p >= 60) return { text: `${p}% Likely`, color: COLOR.spotGreen };
  if (p >= 40) return { text: `${p}% Toss-Up`, color: COLOR.accentGold };
  if (p >= 20) return { text: `${p}% Unlikely`, color: COLOR.accentRed };
  return { text: `${p}% Highly Unlikely`, color: COLOR.accentRed };
}

function articleUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/$/, "")}/article/${slug}`;
}

function unsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/unsubscribe?token=${token}`;
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function Masthead({
  volume,
  editionNumber,
  dispatchDate,
  baseUrl,
}: {
  volume: number;
  editionNumber: number;
  dispatchDate: string;
  baseUrl: string;
}) {
  return (
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
        Dispatched {dispatchDate}
      </Text>
      <Heading
        as="h1"
        style={{
          margin: "8px 0 4px",
          fontFamily: SERIF_DISPLAY,
          fontSize: "44px",
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
      <Text
        style={{
          margin: "4px 0 0",
          fontFamily: SERIF_BODY,
          fontStyle: "italic",
          fontSize: "13px",
          color: COLOR.inkMedium,
        }}
      >
        Vol. {volume} &middot; No. {editionNumber}
      </Text>
    </Section>
  );
}

function StoryBlock({
  story,
  baseUrl,
  isTop,
}: {
  story: DigestStory;
  baseUrl: string;
  isTop: boolean;
}) {
  const odds = probabilityLabel(story.probability);
  return (
    <Section
      style={{
        padding: isTop ? "24px 24px 20px" : "16px 24px",
        borderBottom: `1px solid ${COLOR.ruleSoft}`,
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: SANS_UI,
          fontSize: "10px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLOR.accentRed,
          fontWeight: 700,
        }}
      >
        {story.category}
      </Text>
      <Heading
        as={isTop ? "h2" : "h3"}
        style={{
          margin: "6px 0 8px",
          fontFamily: SERIF_DISPLAY,
          fontSize: isTop ? "28px" : "20px",
          fontWeight: 800,
          color: COLOR.ink,
          lineHeight: 1.15,
        }}
      >
        <Link
          href={articleUrl(baseUrl, story.slug)}
          style={{ color: COLOR.ink, textDecoration: "none" }}
        >
          {story.headline}
        </Link>
      </Heading>
      {story.dek ? (
        <Text
          style={{
            margin: "0 0 10px",
            fontFamily: SERIF_BODY,
            fontStyle: "italic",
            fontSize: isTop ? "16px" : "14px",
            lineHeight: 1.5,
            color: COLOR.inkMedium,
          }}
        >
          {story.dek}
        </Text>
      ) : null}
      <Text
        style={{
          margin: "0 0 8px",
          fontFamily: SANS_UI,
          fontSize: "12px",
          letterSpacing: "0.05em",
        }}
      >
        <span style={{ color: odds.color, fontWeight: 700 }}>{odds.text}</span>
      </Text>
      <Link
        href={articleUrl(baseUrl, story.slug)}
        style={{
          fontFamily: SANS_UI,
          fontSize: "12px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: COLOR.accentBlue,
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Read the dispatch &rarr;
      </Link>
    </Section>
  );
}

function ChallengeTeaser({ challenge }: { challenge: DigestChallenge }) {
  return (
    <Section
      style={{
        margin: "24px 24px 0",
        padding: "20px",
        backgroundColor: COLOR.paperWarm,
        border: `1px solid ${COLOR.rule}`,
        textAlign: "center",
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: SANS_UI,
          fontSize: "10px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: COLOR.accentRed,
          fontWeight: 700,
        }}
      >
        Today&apos;s Challenge
      </Text>
      <Heading
        as="h3"
        style={{
          margin: "8px 0",
          fontFamily: SERIF_DISPLAY,
          fontSize: "20px",
          fontWeight: 800,
          color: COLOR.ink,
          lineHeight: 1.2,
        }}
      >
        {challenge.headline}
      </Heading>
      <Text
        style={{
          margin: "0 0 14px",
          fontFamily: SERIF_BODY,
          fontStyle: "italic",
          fontSize: "14px",
          color: COLOR.inkMedium,
        }}
      >
        {challenge.marketCount} markets, predict their direction.
      </Text>
      <Button
        href={challenge.url}
        style={{
          backgroundColor: COLOR.ink,
          color: COLOR.paperCream,
          padding: "12px 22px",
          fontFamily: SANS_UI,
          fontSize: "12px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Match Wits with the Editor
      </Button>
    </Section>
  );
}

function Footer({
  baseUrl,
  unsubscribeToken,
}: {
  baseUrl: string;
  unsubscribeToken: string;
}) {
  return (
    <Section
      style={{
        padding: "24px",
        textAlign: "center",
        borderTop: `3px double ${COLOR.accentGold}`,
        marginTop: "16px",
      }}
    >
      <Text
        style={{
          margin: 0,
          fontFamily: SERIF_BODY,
          fontStyle: "italic",
          fontSize: "13px",
          color: COLOR.inkMedium,
          lineHeight: 1.5,
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
  );
}

// ── Main template ────────────────────────────────────────────────────────

export function DigestEmail(props: DigestContent): React.ReactElement {
  const {
    volume,
    editionNumber,
    dispatchDate,
    topStory,
    secondaryStories,
    challenge,
    baseUrl,
    unsubscribeToken,
  } = props;

  const preheader =
    topStory.dek?.split(/(?<=[.!?])\s/)[0] ?? topStory.headline;

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
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
          <Masthead
            volume={volume}
            editionNumber={editionNumber}
            dispatchDate={dispatchDate}
            baseUrl={baseUrl}
          />

          <StoryBlock story={topStory} baseUrl={baseUrl} isTop />

          {secondaryStories.length > 0 ? (
            <Section>
              <Row>
                <Column>
                  <Text
                    style={{
                      margin: "20px 24px 4px",
                      fontFamily: SANS_UI,
                      fontSize: "10px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: COLOR.accentGold,
                      fontWeight: 700,
                    }}
                  >
                    Also in this edition
                  </Text>
                  <Hr
                    style={{
                      margin: "0 24px 0",
                      borderColor: COLOR.rule,
                      borderTop: `1px solid ${COLOR.rule}`,
                      borderBottom: 0,
                    }}
                  />
                </Column>
              </Row>
              {secondaryStories.map((s) => (
                <StoryBlock
                  key={s.slug}
                  story={s}
                  baseUrl={baseUrl}
                  isTop={false}
                />
              ))}
            </Section>
          ) : null}

          {challenge ? <ChallengeTeaser challenge={challenge} /> : null}

          <Footer baseUrl={baseUrl} unsubscribeToken={unsubscribeToken} />
        </Container>
      </Body>
    </Html>
  );
}

export default DigestEmail;
