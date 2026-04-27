/**
 * /referrals — subscriber-facing referral dashboard.
 *
 * Server component. Identification is via the per-recipient
 * `unsubscribeToken` query param (`/referrals?token=<uuid>`), which is the
 * same identifier the digest emails carry. We deliberately do NOT use auth
 * here — there's no user-account system on the public site (LAUNCH.md
 * Phase 1-3). Possession of the token = ownership of the subscription, and
 * the dashboard is read-only.
 *
 * If no token is supplied we render a CTA: "Subscribe to get your referral
 * code." We do NOT 302 redirect because that breaks deep links from the
 * digest footer when the token has been stripped by an aggressive privacy
 * extension.
 *
 * Recent referrals are rendered in an anonymized line-style summary —
 * never include emails or any PII even when we have the data.
 */
import Link from "next/link";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppUrl } from "@/lib/url";
import { getOrCreateReferralCode } from "@/lib/referral/code";
import {
  REWARD_THRESHOLD,
  buildShareUrl,
  loadRecentReferrals,
  loadReferralStats,
  type RecentReferralRow,
  type ReferralStats,
} from "@/lib/referral/funnel";
import { ReferralShareButton } from "@/components/ReferralShareButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your Referrals — The Future Express",
  description:
    "Track your referral funnel: clicks, sign-ups, and activations. Invite three friends to earn a free month of Pro.",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

function relativeDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function StageLabel({ row }: { row: RecentReferralRow }) {
  if (row.stage === "activated") {
    return (
      <span style={{ color: "var(--color-spot-green, #3f6b3a)", fontWeight: 700 }}>
        activated {relativeDay(row.activatedAt?.toISOString())}
      </span>
    );
  }
  if (row.stage === "signed_up") {
    return (
      <span style={{ color: "var(--color-accent-blue, #2e4a6b)", fontWeight: 700 }}>
        signed up {relativeDay(row.signedUpAt?.toISOString())}
      </span>
    );
  }
  return (
    <span style={{ color: "var(--color-ink-medium, #4a4338)" }}>
      clicked {relativeDay(row.clickedAt.toISOString())}
    </span>
  );
}

function FunnelStage({
  label,
  value,
  faded,
}: {
  label: string;
  value: number;
  faded?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        padding: "16px 12px",
        borderRight: "1px solid var(--color-rule)",
        opacity: faded ? 0.55 : 1,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display, Georgia, serif)",
          fontSize: "40px",
          fontWeight: 800,
          lineHeight: 1,
          color: "var(--color-ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-ui, system-ui, sans-serif)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--color-ink-medium)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function CallToSubscribe() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="section-title text-3xl mb-4">Referrals</h1>
      <p
        className="text-base mb-6"
        style={{ color: "var(--color-ink-medium)" }}
      >
        The referral dashboard is private to subscribers. Once you subscribe,
        the dispatch you receive each morning will include a personal link
        that opens this page with your funnel stats.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] uppercase tracking-wider text-sm font-bold"
      >
        Subscribe to The Future Express
      </Link>
    </main>
  );
}

export default async function ReferralsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const token = sp.token;

  if (!token || !UUID_RE.test(token)) {
    return <CallToSubscribe />;
  }

  const [sub] = await db
    .select({
      id: subscribers.id,
      status: subscribers.status,
      referralCode: subscribers.referralCode,
    })
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  if (!sub) {
    return <CallToSubscribe />;
  }

  if (sub.status !== "active") {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="section-title text-3xl mb-4">Referrals</h1>
        <p style={{ color: "var(--color-ink-medium)" }}>
          Your subscription is currently inactive. Re-subscribe to access your
          referral dashboard.
        </p>
      </main>
    );
  }

  const code =
    sub.referralCode ?? (await getOrCreateReferralCode(sub.id));
  const baseUrl = getAppUrl();
  const shareUrl = buildShareUrl(baseUrl, code);

  const [stats, recent]: [ReferralStats, RecentReferralRow[]] =
    await Promise.all([
      loadReferralStats(sub.id),
      loadRecentReferrals(sub.id, 10),
    ]);

  const remaining = Math.max(0, REWARD_THRESHOLD - stats.activated);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="section-title text-3xl mb-2">Your Referrals</h1>
      <p
        className="text-sm mb-8 italic"
        style={{ color: "var(--color-ink-medium)" }}
      >
        A standing record of your influence on the readership.
      </p>

      {/* Code + share */}
      <section
        className="mb-8 p-6"
        style={{
          border: "1px solid var(--color-rule)",
          backgroundColor: "var(--color-paper-cream)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui, system-ui, sans-serif)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-ink-medium)",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Your Code
        </div>
        <div
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: "0.08em",
            color: "var(--color-ink)",
          }}
        >
          {code}
        </div>
        <div className="mt-4 text-sm" style={{ color: "var(--color-ink-medium)" }}>
          Share link
        </div>
        <ReferralShareButton shareUrl={shareUrl} />
      </section>

      {/* Funnel */}
      <section
        className="mb-8"
        style={{ border: "1px solid var(--color-rule)" }}
      >
        <div style={{ display: "flex" }}>
          <FunnelStage label="Clicked" value={stats.clicked} />
          <FunnelStage label="Signed Up" value={stats.signedUp} />
          <FunnelStage
            label="Activated"
            value={stats.activated}
            faded={stats.activated === 0}
          />
        </div>
      </section>

      {/* Reward */}
      <section
        className="mb-10 p-5"
        style={{
          border: "1px solid var(--color-rule)",
          backgroundColor: stats.rewardEligible
            ? "var(--color-paper-cream)"
            : "transparent",
        }}
      >
        <div
          className="text-sm mb-1"
          style={{
            fontFamily: "var(--font-ui, system-ui, sans-serif)",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-accent-gold)",
            fontWeight: 700,
          }}
        >
          Progress to reward
        </div>
        <div
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--color-ink)",
          }}
        >
          {stats.rewardEligible
            ? "Three friends activated. Pro tier reward queued."
            : `${stats.activated} of ${REWARD_THRESHOLD} friends activated — ${remaining} to a free month of Pro.`}
        </div>
        {stats.rewardEligible && !stats.rewardGranted ? (
          <p
            className="mt-2 text-sm italic"
            style={{ color: "var(--color-ink-medium)" }}
          >
            Pro launches soon; your free month will be added automatically.
          </p>
        ) : null}
      </section>

      {/* Recent activity */}
      <section>
        <h2
          className="section-title text-xl mb-3"
          style={{ borderBottom: "1px solid var(--color-rule)", paddingBottom: 8 }}
        >
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p
            className="italic text-sm"
            style={{ color: "var(--color-ink-medium)" }}
          >
            No clicks yet. Share your link to see activity here.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontFamily: "var(--font-body, Georgia, serif)",
            }}
          >
            {recent.map((r, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-rule)",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--color-ink)" }}>
                  A reader
                </span>{" "}
                <StageLabel row={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
