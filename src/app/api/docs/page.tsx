"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH" | "PUT";

interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "body";
  required: boolean;
  type: string;
  description: string;
  example?: string;
}

interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  longDescription?: string;
  auth: "bearer" | "x402" | "none";
  parameters?: Parameter[];
  requestBody?: { description: string; example: string };
  exampleResponse: string;
  curlExample: string;
  category: string;
}

// ─── API Spec (hand-authored from actual routes) ──────────────────────────────

const BASE_URL = "https://futureexpress.xyz";

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/articles",
    category: "Articles",
    description: "List prediction-market articles with live probability data",
    longDescription:
      "Returns paginated articles joined with their associated market. Each article includes the probability at publish time and the current live probability from Polymarket/Kalshi.",
    auth: "bearer",
    parameters: [
      {
        name: "Authorization",
        in: "header",
        required: true,
        type: "string",
        description: "Bearer token. Use your API key or pay-per-request via x402.",
        example: "Bearer fe_abc123...",
      },
      {
        name: "category",
        in: "query",
        required: false,
        type: "enum",
        description: "Filter by category.",
        example: "politics | economy | crypto | sports | science | entertainment | world",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        type: "integer",
        description: "Number of results to return. Max 100. Default 20.",
        example: "20",
      },
      {
        name: "offset",
        in: "query",
        required: false,
        type: "integer",
        description: "Pagination offset. Default 0.",
        example: "0",
      },
    ],
    exampleResponse: JSON.stringify(
      {
        data: [
          {
            id: "uuid-...",
            headline: "Fed Likely to Hold Rates in March, Markets Say",
            subheadline: "Probability of a cut remains below 20% as inflation data surprises.",
            slug: "fed-hold-rates-march",
            category: "economy",
            imageUrl: "https://...",
            probabilityAtPublish: "18.50",
            currentProbability: "21.00",
            volume24h: "394210.00",
            publishedAt: "2025-03-01T08:00:00.000Z",
            marketTitle: "Will the Fed cut in March?",
            tradeLinks: {
              polymarket: "https://polymarket.com",
              kalshi: "https://kalshi.com",
            },
            articleUrl: "/article/fed-hold-rates-march",
          },
        ],
        pagination: { limit: 20, offset: 0, returned: 1 },
        _meta: { auth: "api_key", tier: "free" },
      },
      null,
      2
    ),
    curlExample: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${BASE_URL}/api/v1/articles?limit=10&category=economy"`,
  },
  {
    method: "GET",
    path: "/api/v1/markets",
    category: "Markets",
    description: "List active prediction markets with aggregated probability data",
    longDescription:
      "Returns active markets from Polymarket and Kalshi, ordered by 24-hour volume descending. Includes probability data from each platform and trade links.",
    auth: "bearer",
    parameters: [
      {
        name: "Authorization",
        in: "header",
        required: true,
        type: "string",
        description: "Bearer token. Use your API key or pay-per-request via x402.",
        example: "Bearer fe_abc123...",
      },
      {
        name: "category",
        in: "query",
        required: false,
        type: "enum",
        description: "Filter by category.",
        example: "politics | economy | crypto | sports | science | entertainment | world",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        type: "integer",
        description: "Number of results to return. Max 200. Default 50.",
        example: "50",
      },
    ],
    exampleResponse: JSON.stringify(
      {
        data: [
          {
            id: "uuid-...",
            title: "Will BTC exceed $100k by June 2025?",
            category: "crypto",
            currentProbability: "62.40",
            polymarketProbability: "63.00",
            kalshiProbability: "61.80",
            volume24h: "2847000.00",
            status: "active",
            polymarketSlug: "will-btc-exceed-100k",
            kalshiEventTicker: "CRYPTO-BTC-100K",
            updatedAt: "2025-03-01T09:30:00.000Z",
            tradeLinks: {
              polymarket: "https://polymarket.com/event/will-btc-exceed-100k",
              kalshi: "https://kalshi.com/markets/CRYPTO-BTC-100K",
            },
          },
        ],
        _meta: { auth: "api_key", tier: "free", returned: 1 },
      },
      null,
      2
    ),
    curlExample: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${BASE_URL}/api/v1/markets?limit=20&category=crypto"`,
  },
  {
    method: "GET",
    path: "/api/v1/editions/latest",
    category: "Editions",
    description: "Fetch the latest published edition with all its articles",
    longDescription:
      "Returns the most recently published edition (morning, evening, breaking, or 4h) with the full ordered article list, including live probability data.",
    auth: "bearer",
    parameters: [
      {
        name: "Authorization",
        in: "header",
        required: true,
        type: "string",
        description: "Bearer token. Use your API key or pay-per-request via x402.",
        example: "Bearer fe_abc123...",
      },
    ],
    exampleResponse: JSON.stringify(
      {
        data: {
          id: "uuid-...",
          type: "morning",
          date: "2025-03-01",
          volumeNumber: 42,
          publishedAt: "2025-03-01T08:00:00.000Z",
          articles: [
            {
              headline: "Fed Likely to Hold Rates",
              slug: "fed-hold-rates-march",
              category: "economy",
              probabilityAtPublish: "18.50",
              currentProbability: "21.00",
              position: 1,
              articleUrl: "/article/fed-hold-rates-march",
              tradeLinks: {
                polymarket: "https://polymarket.com",
                kalshi: "https://kalshi.com",
              },
            },
          ],
        },
        _meta: { auth: "api_key", tier: "free" },
      },
      null,
      2
    ),
    curlExample: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "${BASE_URL}/api/v1/editions/latest"`,
  },
  {
    method: "POST",
    path: "/api/v1/keys",
    category: "Authentication",
    description: "Generate a free-tier API key (50 requests/day)",
    longDescription:
      "Creates a new free-tier API key. The raw key is returned once — store it securely. Keys grant 50 requests per day. For higher limits, upgrade to developer or business tier.",
    auth: "none",
    requestBody: {
      description: "Optional JSON body to name your key or link a wallet address.",
      example: JSON.stringify({ name: "my-app", walletAddress: "0xabc..." }, null, 2),
    },
    exampleResponse: JSON.stringify(
      {
        success: true,
        apiKey: "fe_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        tier: "free",
        dailyLimit: 50,
        note: "Store this key securely — it will not be shown again.",
        usage: {
          header: "Authorization: Bearer fe_xxxx...",
          example: `curl -H "Authorization: Bearer fe_xxxx..." ${BASE_URL}/api/v1/articles`,
        },
      },
      null,
      2
    ),
    curlExample: `curl -X POST "${BASE_URL}/api/v1/keys" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-app"}'`,
  },
];

const CATEGORIES = [...new Set(ENDPOINTS.map((e) => e.category))];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: HttpMethod }) {
  const colors: Record<HttpMethod, string> = {
    GET: "bg-[var(--color-spot-green)] text-white",
    POST: "bg-[var(--color-accent-blue)] text-white",
    DELETE: "bg-[var(--color-spot-red)] text-white",
    PATCH: "bg-[var(--color-accent-gold)] text-[var(--color-ink)]",
    PUT: "bg-[var(--color-accent-gold)] text-[var(--color-ink)]",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest font-[family-name:var(--font-ui)] rounded-sm ${colors[method]}`}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: Endpoint["auth"] }) {
  if (auth === "none") {
    return (
      <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase font-[family-name:var(--font-ui)] text-[var(--color-ink-light)] border border-[var(--color-rule)] rounded-sm">
        No Auth
      </span>
    );
  }
  if (auth === "bearer") {
    return (
      <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase font-[family-name:var(--font-ui)] text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)] rounded-sm">
        Bearer Token
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase font-[family-name:var(--font-ui)] text-[var(--color-accent-blue)] border border-[var(--color-accent-blue)] rounded-sm">
      x402
    </span>
  );
}

function InParamBadge({ location }: { location: Parameter["in"] }) {
  const styles: Record<Parameter["in"], string> = {
    query: "text-[var(--color-spot-green)]",
    header: "text-[var(--color-accent-blue)]",
    path: "text-[var(--color-accent-red)]",
    body: "text-[var(--color-accent-gold)]",
  };
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-widest font-[family-name:var(--font-ui)] ${styles[location]}`}
    >
      {location}
    </span>
  );
}

function CurlModal({
  endpoint,
  onClose,
}: {
  endpoint: Endpoint;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(endpoint.curlExample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [endpoint.curlExample]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--color-ink)] opacity-60" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl border-2 border-[var(--color-rule-dark)] bg-[var(--color-paper-cream)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--color-rule)] px-5 py-3">
          <div className="flex items-center gap-3">
            <MethodBadge method={endpoint.method} />
            <code className="text-sm font-[family-name:var(--font-data)] text-[var(--color-ink)]">
              {endpoint.path}
            </code>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--color-ink-light)] hover:text-[var(--color-ink)] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="section-title mb-3">Try It — cURL Command</div>
          <div className="relative bg-[var(--color-paper-warm)] border border-[var(--color-rule)] rounded-sm overflow-x-auto">
            <pre className="p-4 text-xs font-[family-name:var(--font-data)] text-[var(--color-ink-medium)] whitespace-pre-wrap leading-relaxed">
              {endpoint.curlExample}
            </pre>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] border-2 border-[var(--color-rule-dark)] text-[var(--color-ink)] hover:bg-[var(--color-paper-warm)] transition-colors"
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Copy cURL
                </>
              )}
            </button>
            <span className="text-[10px] text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)] italic">
              Replace <code className="font-[family-name:var(--font-data)]">YOUR_API_KEY</code> with your key from{" "}
              <code className="font-[family-name:var(--font-data)]">POST /api/v1/keys</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {showModal && (
        <CurlModal endpoint={endpoint} onClose={() => setShowModal(false)} />
      )}
      <div className="border border-[var(--color-rule)] bg-[var(--color-paper-cream)] card-hover">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-[var(--color-paper-warm)] transition-colors"
        >
          <div className="flex-shrink-0 pt-0.5">
            <MethodBadge method={endpoint.method} />
          </div>
          <div className="flex-1 min-w-0">
            <code className="block text-sm font-[family-name:var(--font-data)] text-[var(--color-ink)] mb-1">
              {endpoint.path}
            </code>
            <p className="text-sm text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]">
              {endpoint.description}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3 pt-0.5">
            <AuthBadge auth={endpoint.auth} />
            <span
              className="text-[var(--color-ink-light)] transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}
              aria-hidden
            >
              ›
            </span>
          </div>
        </button>

        {/* Expanded body */}
        {expanded && (
          <div className="border-t border-[var(--color-rule)] px-5 py-5 space-y-6">
            {endpoint.longDescription && (
              <p className="text-sm text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] leading-relaxed">
                {endpoint.longDescription}
              </p>
            )}

            {/* Parameters table */}
            {endpoint.parameters && endpoint.parameters.length > 0 && (
              <div>
                <div className="section-title mb-3">Parameters</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse font-[family-name:var(--font-ui)]">
                    <thead>
                      <tr className="border-b border-[var(--color-rule)]">
                        <th className="text-left py-2 pr-4 text-[var(--color-ink-light)] font-bold uppercase tracking-wider text-[9px]">
                          Name
                        </th>
                        <th className="text-left py-2 pr-4 text-[var(--color-ink-light)] font-bold uppercase tracking-wider text-[9px]">
                          In
                        </th>
                        <th className="text-left py-2 pr-4 text-[var(--color-ink-light)] font-bold uppercase tracking-wider text-[9px]">
                          Type
                        </th>
                        <th className="text-left py-2 pr-4 text-[var(--color-ink-light)] font-bold uppercase tracking-wider text-[9px]">
                          Required
                        </th>
                        <th className="text-left py-2 text-[var(--color-ink-light)] font-bold uppercase tracking-wider text-[9px]">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.parameters.map((p) => (
                        <tr
                          key={p.name}
                          className="border-b border-[var(--color-rule)] last:border-0"
                        >
                          <td className="py-2.5 pr-4 align-top">
                            <code className="font-[family-name:var(--font-data)] text-[var(--color-ink)] text-[11px]">
                              {p.name}
                            </code>
                          </td>
                          <td className="py-2.5 pr-4 align-top">
                            <InParamBadge location={p.in} />
                          </td>
                          <td className="py-2.5 pr-4 align-top text-[var(--color-ink-medium)]">
                            {p.type}
                          </td>
                          <td className="py-2.5 pr-4 align-top">
                            {p.required ? (
                              <span className="text-[var(--color-accent-red)] font-bold">Yes</span>
                            ) : (
                              <span className="text-[var(--color-ink-faded)]">No</span>
                            )}
                          </td>
                          <td className="py-2.5 align-top text-[var(--color-ink-medium)] leading-relaxed">
                            {p.description}
                            {p.example && (
                              <span className="block mt-0.5 text-[var(--color-ink-faded)] italic">
                                e.g. <code className="font-[family-name:var(--font-data)] not-italic">{p.example}</code>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Request body */}
            {endpoint.requestBody && (
              <div>
                <div className="section-title mb-3">Request Body (optional JSON)</div>
                <p className="text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] mb-2">
                  {endpoint.requestBody.description}
                </p>
                <pre className="bg-[var(--color-paper-warm)] border border-[var(--color-rule)] p-4 text-xs font-[family-name:var(--font-data)] text-[var(--color-ink-medium)] overflow-x-auto leading-relaxed rounded-sm">
                  {endpoint.requestBody.example}
                </pre>
              </div>
            )}

            {/* Example response */}
            <div>
              <div className="section-title mb-3">Example Response</div>
              <pre className="bg-[var(--color-paper-warm)] border border-[var(--color-rule)] p-4 text-xs font-[family-name:var(--font-data)] text-[var(--color-ink-medium)] overflow-x-auto leading-relaxed rounded-sm max-h-80">
                {endpoint.exampleResponse}
              </pre>
            </div>

            {/* Try it button */}
            <div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider font-[family-name:var(--font-ui)] bg-[var(--color-accent-blue)] text-white hover:opacity-90 transition-opacity"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Try It — View cURL
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredEndpoints = activeCategory
    ? ENDPOINTS.filter((e) => e.category === activeCategory)
    : ENDPOINTS;

  return (
    <div className="paper-texture min-h-screen">
      {/* Masthead bar */}
      <header className="border-b-2 border-[var(--color-ink)] bg-[var(--color-paper-cream)]">
        <div className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-4)] flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-widest text-[var(--color-ink-light)] font-[family-name:var(--font-ui)] hover:text-[var(--color-accent-blue)] transition-colors"
          >
            ← The Future Express
          </Link>
          <span className="section-title">API Reference</span>
        </div>
      </header>

      {/* Double rule */}
      <div className="divider-double" />

      <main className="max-w-[var(--max-width)] mx-auto px-[var(--space-5)] py-[var(--space-7)]">
        {/* Title block */}
        <div className="text-center mb-[var(--space-7)] border-b border-[var(--color-rule)] pb-[var(--space-6)]">
          <div className="section-title mb-3">The Future Express</div>
          <h1
            className="text-4xl md:text-5xl font-bold text-[var(--color-ink)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            API Documentation
          </h1>
          <p className="text-lg text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] italic max-w-2xl mx-auto">
            Programmatic access to prediction market data, articles, and editions.
            Authenticated via API key or pay-per-request with x402.
          </p>

          {/* Key stats row */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {[
              { label: "Base URL", value: BASE_URL },
              { label: "Auth", value: "Bearer / x402" },
              { label: "Rate Limit (free)", value: "50 req/day" },
              { label: "Format", value: "JSON" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)] mb-0.5">
                  {s.label}
                </div>
                <code className="text-xs font-[family-name:var(--font-data)] text-[var(--color-ink-medium)]">
                  {s.value}
                </code>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar — navigation + quickstart */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Category filter */}
              <div>
                <div className="section-title mb-3">Sections</div>
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`w-full text-left text-sm px-3 py-2 font-[family-name:var(--font-ui)] transition-colors ${
                      activeCategory === null
                        ? "bg-[var(--color-accent-blue)] text-white font-bold"
                        : "text-[var(--color-ink-medium)] hover:bg-[var(--color-paper-warm)]"
                    }`}
                  >
                    All Endpoints
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left text-sm px-3 py-2 font-[family-name:var(--font-ui)] transition-colors ${
                        activeCategory === cat
                          ? "bg-[var(--color-accent-blue)] text-white font-bold"
                          : "text-[var(--color-ink-medium)] hover:bg-[var(--color-paper-warm)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Quickstart */}
              <div className="border border-[var(--color-rule)] p-4 bg-[var(--color-paper-cream)]">
                <div className="section-title mb-3">Quick Start</div>
                <ol className="space-y-3 text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)]">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-[var(--color-rule-dark)] flex items-center justify-center text-[9px] font-bold font-[family-name:var(--font-ui)]">
                      1
                    </span>
                    <span>
                      <strong>Generate a key</strong> via{" "}
                      <code className="font-[family-name:var(--font-data)] text-[10px]">POST /api/v1/keys</code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-[var(--color-rule-dark)] flex items-center justify-center text-[9px] font-bold font-[family-name:var(--font-ui)]">
                      2
                    </span>
                    <span>
                      <strong>Pass it</strong> as{" "}
                      <code className="font-[family-name:var(--font-data)] text-[10px]">Authorization: Bearer fe_...</code>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full border border-[var(--color-rule-dark)] flex items-center justify-center text-[9px] font-bold font-[family-name:var(--font-ui)]">
                      3
                    </span>
                    <span>
                      <strong>Query</strong> articles, markets, or editions
                    </span>
                  </li>
                </ol>
              </div>

              {/* x402 note */}
              <div className="border border-[var(--color-accent-gold)] p-4 bg-[var(--color-paper-cream)]">
                <div className="section-title mb-2" style={{ color: "var(--color-accent-gold)" }}>
                  Pay-Per-Request (x402)
                </div>
                <p className="text-xs text-[var(--color-ink-medium)] font-[family-name:var(--font-sub)] leading-relaxed">
                  No API key needed. Pay micro-amounts in USDC per request using the x402 protocol.
                  Your client must handle <code className="font-[family-name:var(--font-data)] text-[10px]">402 Payment Required</code> responses.
                </p>
              </div>

              {/* OpenAPI link */}
              <div>
                <div className="section-title mb-2">Machine-Readable Spec</div>
                <Link
                  href="/api/v1/openapi.json"
                  target="_blank"
                  className="text-xs text-[var(--color-accent-blue)] hover:underline font-[family-name:var(--font-ui)]"
                >
                  openapi.json →
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-8">
            {CATEGORIES.filter((cat) =>
              !activeCategory || cat === activeCategory
            ).map((category) => {
              const endpoints = filteredEndpoints.filter(
                (e) => e.category === category
              );
              if (endpoints.length === 0) return null;
              return (
                <section key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-4 mb-4">
                    <h2
                      className="text-xl font-bold text-[var(--color-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {category}
                    </h2>
                    <div className="flex-1 border-t border-[var(--color-rule)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)]">
                      {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Endpoint cards */}
                  <div className="space-y-3">
                    {endpoints.map((endpoint) => (
                      <EndpointCard
                        key={`${endpoint.method}-${endpoint.path}`}
                        endpoint={endpoint}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--color-rule)] text-center">
          <p className="text-xs text-[var(--color-ink-faded)] font-[family-name:var(--font-sub)] italic">
            The Future Express API · Est. 2025 · Tomorrow&apos;s News, Today&apos;s Odds
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-faded)] font-[family-name:var(--font-ui)]">
            <Link
              href="/api/v1/openapi.json"
              className="underline hover:text-[var(--color-accent-blue)] transition-colors"
              target="_blank"
            >
              OpenAPI Spec
            </Link>
            <span className="mx-2">·</span>
            <Link
              href="/"
              className="underline hover:text-[var(--color-accent-blue)] transition-colors"
            >
              Front Page
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
