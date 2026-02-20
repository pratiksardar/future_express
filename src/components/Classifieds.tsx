export function Classifieds() {
  const ads = [
    { title: "FOR SALE: One slightly used NFT. Mint condition. Inquire within.", id: "1" },
    { title: "WANTED: Oracle for reliable data feed. Must be resistant to Sybil attacks.", id: "2" },
  ];

  return (
    <section className="py-6 border-t border-[var(--color-rule)]">
      <h2 className="section-title mb-3">
        Notices &amp; Classifieds
      </h2>
      <ul className="space-y-2 text-sm text-[var(--color-ink-medium)] font-[family-name:var(--font-body)]">
        {ads.map((ad) => (
          <li key={ad.id}>* {ad.title}</li>
        ))}
      </ul>
      <p className="text-xs text-[var(--color-ink-faded)] mt-3">
        Place a classified: contact@thefutureexpress.com
      </p>
    </section>
  );
}
