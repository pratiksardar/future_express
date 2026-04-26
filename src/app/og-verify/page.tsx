/**
 * /og-verify — internal admin dashboard for OG card verification.
 *
 * Lists the 10 most recent articles. For each:
 *   - shows headline, slug, category, published timestamp
 *   - inlines a preview of the OG image directly via the
 *     /article/[slug]/opengraph-image route
 *   - emits one-click validator URLs (opengraph.xyz, metatags.io,
 *     LinkedIn Post Inspector, Twitter cards-dev)
 *
 * NOT linked from navigation. `noindex,nofollow` enforced via the
 * exported `metadata.robots` block — Phase 1 launch tooling only.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getAppUrl } from "@/lib/url";

export const metadata: Metadata = {
  title: "OG Verify — Internal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

// Force fresh data on every request — this is an internal verification
// surface, not a public page. Don't cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ValidatorEntry {
  name: string;
  url: string;
}

function validatorUrls(articleUrl: string): ValidatorEntry[] {
  const enc = encodeURIComponent(articleUrl);
  return [
    { name: "opengraph.xyz", url: `https://www.opengraph.xyz/url/${enc}` },
    { name: "metatags.io", url: `https://metatags.io/?url=${enc}` },
    { name: "LinkedIn Inspector", url: `https://www.linkedin.com/post-inspector/inspect/${enc}` },
    { name: "Twitter cards-dev", url: `https://cards-dev.twitter.com/validator?url=${enc}` },
  ];
}

export default async function OgVerifyPage(): Promise<React.JSX.Element> {
  const recent = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      headline: articles.headline,
      subheadline: articles.subheadline,
      category: articles.category,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(10);

  const base = getAppUrl();

  return (
    <div
      style={{
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        background: "#fafaf6",
        color: "#1a1a1a",
        minHeight: "100vh",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 16, marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            /og-verify · internal
          </h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 8, marginBottom: 0 }}>
            Recent articles + inline OG previews + per-platform validator deep links. Not in
            navigation. <code>noindex,nofollow</code>. See{" "}
            <code>docs/og-audit.md § Manual Verification Procedure</code> for the manual
            10-minute walkthrough.
          </p>
          <p style={{ fontSize: 12, color: "#777", marginTop: 8, marginBottom: 0 }}>
            Base URL: <code>{base}</code> · {recent.length} article{recent.length === 1 ? "" : "s"}{" "}
            shown
          </p>
        </header>

        {recent.length === 0 ? (
          <p>No articles in DB.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 24,
            }}
          >
            {recent.map((a) => {
              const articleUrl = `${base}/article/${a.slug}`;
              const ogImageUrl = `${base}/article/${a.slug}/opengraph-image`;
              const validators = validatorUrls(articleUrl);
              return (
                <li
                  key={a.id}
                  style={{
                    border: "1px solid #d0d0c8",
                    background: "#fff",
                    padding: 20,
                    display: "grid",
                    gridTemplateColumns: "minmax(280px, 480px) 1fr",
                    gap: 24,
                    alignItems: "start",
                  }}
                >
                  <div>
                    {/* Inline preview of the OG image. We use a plain <img>
                        here (not next/image) because we want the raw bytes
                        served by the actual OG route — that's what social
                        platforms see. next/image would optimize and lie. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ogImageUrl}
                      alt={`OG preview for ${a.headline}`}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        border: "1px solid #1a1a1a",
                        background: "#eee",
                      }}
                      width={1200}
                      height={630}
                    />
                    <div style={{ fontSize: 11, color: "#666", marginTop: 6, lineHeight: 1.4 }}>
                      <div>
                        <strong>OG image:</strong>{" "}
                        <a href={ogImageUrl} target="_blank" rel="noopener noreferrer">
                          {ogImageUrl.replace(base, "")}
                        </a>
                      </div>
                      <div>Expected: 1200×630, &lt; 300 KB (WhatsApp cap)</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#777",
                          marginBottom: 4,
                        }}
                      >
                        {a.category} · {new Date(a.publishedAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                      </div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>
                        {a.headline}
                      </h2>
                      {a.subheadline && (
                        <p style={{ fontSize: 13, color: "#444", margin: 0, lineHeight: 1.4 }}>
                          {a.subheadline}
                        </p>
                      )}
                      <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
                        slug: <code style={{ background: "#f0f0e8", padding: "1px 4px" }}>{a.slug}</code>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "#777",
                          marginBottom: 6,
                        }}
                      >
                        Test on
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Link
                          href={articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            background: "#1a1a1a",
                            color: "#fff",
                            textDecoration: "none",
                            border: "1px solid #1a1a1a",
                          }}
                        >
                          → article
                        </Link>
                        {validators.map((v) => (
                          <a
                            key={v.name}
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              padding: "4px 8px",
                              background: "#fff",
                              color: "#1a1a1a",
                              border: "1px solid #1a1a1a",
                              textDecoration: "none",
                            }}
                          >
                            {v.name}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5, paddingTop: 6, borderTop: "1px dashed #d0d0c8" }}>
                      <strong>CLI:</strong>{" "}
                      <code style={{ background: "#f0f0e8", padding: "1px 4px" }}>
                        npx tsx scripts/og-verify.ts {a.slug}
                      </code>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #d0d0c8", fontSize: 11, color: "#888" }}>
          For Discord / Slack / iMessage / WhatsApp / Telegram — DM the URL to yourself
          (no public validators exist). See <code>docs/og-audit.md</code>.
        </footer>
      </div>
    </div>
  );
}
