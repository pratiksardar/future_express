import Link from "next/link";
import Image from "next/image";

type ArticleCardProps = {
  headline: string;
  subheadline?: string | null;
  slug: string;
  category: string;
  imageUrl?: string | null;
  probabilityAtPublish?: string | null;
  currentProbability?: string | null;
  publishedAt?: string;
  volume24h?: string | null;
  size?: "default" | "hero" | "compact";
};

const CATEGORY_LABELS: Record<string, string> = {
  politics: "Politics",
  economy: "Economy",
  crypto: "Crypto",
  sports: "Sports",
  science: "Science",
  entertainment: "Entertainment",
  world: "World",
};

function probColor(p: number) {
  if (p >= 70) return "var(--color-spot-green)";
  if (p >= 40) return "var(--color-ink-light)";
  return "var(--color-spot-red)";
}

export function ArticleCard({
  headline,
  subheadline,
  slug,
  category,
  imageUrl,
  probabilityAtPublish,
  currentProbability,
  publishedAt,
  volume24h,
  size = "default",
}: ArticleCardProps) {
  const prob = currentProbability ?? probabilityAtPublish;
  const p = prob ? parseInt(prob, 10) : 50;

  if (size === "hero") {
    return (
      <article className="border-l-4 border-l-[var(--color-accent-red)] pl-[var(--space-5)] border-b-[var(--border-double)] pb-[var(--space-7)]">
        <div className="section-title mb-3">
          {CATEGORY_LABELS[category] ?? category}
        </div>
        <Link href={`/article/${slug}`} className="block group">
          {imageUrl && (
            <div className="mb-4 overflow-hidden rounded shadow-sm relative aspect-video">
              <Image src={imageUrl} alt={headline} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          )}
          <h2
            className="text-3xl md:text-4xl lg:text-5xl xl:text-[2.75rem] font-black leading-[1.15] text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] transition-colors duration-200 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {headline}
          </h2>
        </Link>
        {subheadline && (
          <p className="text-lg md:text-xl italic text-[var(--color-ink-medium)] mb-5 font-[family-name:var(--font-sub)] max-w-2xl leading-snug">
            {subheadline}
          </p>
        )}
        <div className="flex items-center gap-5 flex-wrap">
          <span
            className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-data)] tabular-nums"
            style={{ color: probColor(p) }}
          >
            {prob}%
          </span>
          <span className="text-sm italic text-[var(--color-ink-light)] font-[family-name:var(--font-sub)]">
            By The Future Express · {publishedAt ? new Date(publishedAt).toLocaleDateString() : ""}
          </span>
        </div>
        {volume24h && (
          <p className="text-xs text-[var(--color-ink-faded)] mt-2">
            Source: Polymarket · ${volume24h}
          </p>
        )}
      </article>
    );
  }

  if (size === "compact") {
    return (
      <Link
        href={`/article/${slug}`}
        className="block py-3 border-b border-[var(--color-rule)] group transition-colors duration-150 last:border-b-0"
      >
        <div className="flex justify-between items-baseline gap-3">
          <span className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] transition-colors font-[family-name:var(--font-sub)] text-[15px] leading-snug">
            {headline.slice(0, 55)}
            {headline.length > 55 ? "…" : ""}
          </span>
          <span
            className="text-sm font-bold shrink-0 font-[family-name:var(--font-data)] tabular-nums"
            style={{ color: probColor(p) }}
          >
            {prob}%
          </span>
        </div>
      </Link>
    );
  }

  return (
    <article className="card-hover p-[var(--space-5)] bg-[var(--color-paper-warm)] border border-[var(--color-rule)] rounded-sm">
      <div className="section-title mb-2">
        {CATEGORY_LABELS[category] ?? category}
      </div>
      <Link href={`/article/${slug}`} className="block group">
        {imageUrl && (
          <div className="mb-3 overflow-hidden rounded relative aspect-video">
            <Image src={imageUrl} alt={headline} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <h3
          className="text-xl font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-accent-blue)] transition-colors duration-200 mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {headline}
        </h3>
      </Link>
      {subheadline && (
        <p className="text-sm italic text-[var(--color-ink-medium)] mb-3 font-[family-name:var(--font-sub)] line-clamp-2 leading-relaxed">
          {subheadline}
        </p>
      )}
      <div
        className="inline-block px-2.5 py-1 text-sm font-bold rounded-sm font-[family-name:var(--font-data)] tabular-nums"
        style={{ backgroundColor: "var(--color-paper-cream)", color: probColor(p) }}
      >
        {prob}%
      </div>
      <p className="text-xs italic text-[var(--color-ink-light)] mt-2 font-[family-name:var(--font-sub)]">
        By The Future Express · {publishedAt ? new Date(publishedAt).toLocaleDateString() : ""}
      </p>
    </article>
  );
}
