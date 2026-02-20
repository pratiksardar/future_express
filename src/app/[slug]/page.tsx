import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "about",
  "edition",
  "editions",
  "article",
  "search",
  "section",
  "api",
  "_next",
  "favicon.ico",
]);

/**
 * Top-level numeric path (e.g. /1, /2) → redirect to that volume's edition.
 * Non-numeric or reserved paths → 404.
 */
export default async function NumericVolumePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = slug.trim().toLowerCase();
  if (RESERVED.has(s)) notFound();
  if (!/^\d+$/.test(s)) notFound();
  const num = Math.max(1, parseInt(s, 10));
  redirect(`/edition/${num}`);
}
