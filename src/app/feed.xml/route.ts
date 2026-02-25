import { db } from "@/lib/db";
import { articles } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://future-express.vercel.app";

    const recentArticles = await db
        .select({
            headline: articles.headline,
            subheadline: articles.subheadline,
            slug: articles.slug,
            category: articles.category,
            publishedAt: articles.publishedAt,
        })
        .from(articles)
        .orderBy(desc(articles.publishedAt))
        .limit(30);

    const items = recentArticles
        .map(
            (a) => `    <item>
      <title><![CDATA[${a.headline}]]></title>
      <link>${appUrl}/article/${a.slug}</link>
      <description><![CDATA[${a.subheadline ?? a.headline}]]></description>
      <category>${a.category}</category>
      <pubDate>${a.publishedAt ? new Date(a.publishedAt).toUTCString() : ""}</pubDate>
      <guid isPermaLink="true">${appUrl}/article/${a.slug}</guid>
    </item>`
        )
        .join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Future Express</title>
    <link>${appUrl}</link>
    <description>AI-generated prediction market news — powered by Polymarket, Kalshi, and autonomous agents.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${appUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

    return new Response(rss, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
        },
    });
}
