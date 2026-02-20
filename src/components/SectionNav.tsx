import Link from "next/link";

const SECTIONS = [
  { href: "/", label: "Front Page" },
  { href: "/section/politics", label: "Politics" },
  { href: "/section/crypto", label: "Crypto" },
  { href: "/section/economy", label: "Economy" },
  { href: "/section/sports", label: "Sports" },
  { href: "/section/science", label: "Science" },
  { href: "/section/entertainment", label: "Entertainment" },
  { href: "/section/world", label: "World" },
  { href: "/search", label: "Search" },
] as const;

export function SectionNav() {
  return (
    <nav className="border-b border-[var(--color-rule)] bg-[var(--color-paper-cream)]/50" aria-label="Sections">
      <div className="max-w-[var(--max-width)] mx-auto px-[var(--space-4)] sm:px-[var(--space-5)]">
        <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 py-3 sm:gap-x-6 text-[11px] font-bold uppercase tracking-[0.15em] font-[family-name:var(--font-ui)]">
          {SECTIONS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-[var(--color-ink)] hover:text-[var(--color-accent-blue)] transition-colors duration-150 py-1"
              >
                {label}
              </Link>
              {href !== SECTIONS[SECTIONS.length - 1].href && (
                <span className="mx-1.5 sm:mx-2 text-[var(--color-rule-dark)] select-none" aria-hidden>·</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
