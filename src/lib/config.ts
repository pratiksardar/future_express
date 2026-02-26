/**
 * Centralized, Zod-validated configuration for Future Express.
 *
 * Every env var the app reads is declared here, with defaults where appropriate.
 * Import `config` from this module instead of reading `process.env` directly.
 *
 * SECURITY (Vercel / any deployment):
 * - Next.js exposes ONLY env vars prefixed with NEXT_PUBLIC_ to the browser bundle.
 * - All keys below that are NOT NEXT_PUBLIC_ are server-only and must stay that way.
 * - Never add NEXT_PUBLIC_ to: *_API_KEY, *_SECRET, *_PRIVATE_KEY, DATABASE_URL, or any LLM/API secret.
 *
 * Calling `config` is lazy — the schema is parsed once on first access — so
 * importing this module in tests or build scripts won't throw if env is missing.
 */
import { z } from "zod";

// ────────────────────────────────────────────────
// Schema (server-only keys have no NEXT_PUBLIC_ prefix)
// ────────────────────────────────────────────────

const envSchema = z.object({
    // ── Database ──
    DATABASE_URL: z
        .string()
        .default("postgresql://postgres:postgres@localhost:5432/future_express"),

    // ── LLM / Article Generation (server-only; never use NEXT_PUBLIC_ for these) ──
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_ARTICLE_MODEL: z.string().default("gpt-4o-mini"),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default("arcee-ai/trinity-mini:free"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),

    // ── LLM Provider Priority (comma-separated, first = primary, rest = fallbacks) ──
    LLM_PROVIDER_PRIORITY: z.string().default("openrouter,openai,anthropic"),

    // ── Web Research (server-only) ──
    TAVILY_API_KEY: z.string().optional(),
    BRAVE_API_KEY: z.string().optional(),

    // ── Kalshi (server-only) ──
    KALSHI_API_KEY: z.string().optional(),

    // ── Public / safe for client (NEXT_PUBLIC_ is inlined into browser bundle) ──
    NEXT_PUBLIC_POLYMARKET_AFFILIATE_URL: z
        .string()
        .default("https://polymarket.com"),
    NEXT_PUBLIC_KALSHI_AFFILIATE_URL: z
        .string()
        .default("https://kalshi.com"),

    // ── Newsletter ──
    NEXT_PUBLIC_SUBSTACK_URL: z.string().optional(),
    NEXT_PUBLIC_BEEHIIV_URL: z.string().optional(),

    NEXT_PUBLIC_AD_SLOT_ID: z.string().optional(),

    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

    // ── Uniswap (server-only; used in API routes only) ──
    UNISWAP_API_KEY: z.string().optional(),

    // ── Base / CDP (server-only; private keys never in client) ──
    USE_BASE_SEPOLIA: z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    NEXT_PUBLIC_USE_BASE_SEPOLIA: z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    BASE_RPC_URL: z.string().optional(),
    BASE_SEPOLIA_PRIVATE_KEY: z.string().optional(),
    CDP_CLIENT_API_KEY: z.string().optional(),
    CDP_PROJECT_ID: z.string().optional(),
    CDP_API_KEY_NAME: z.string().optional(),
    CDP_API_KEY_PRIVATE_KEY: z.string().optional(),

    // ── Editor Wallet (server-only) ──
    EDITOR_WALLET_ADDRESS: z.string().optional(),
    MIN_EDITOR_BALANCE_ETH: z.string().default("0.001"),

    // ── Hedera (server-only) ──
    HEDERA_ACCOUNT_ID: z.string().optional(),
    HEDERA_PRIVATE_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

// ────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────

let _config: AppConfig | null = null;

/** Parse + validate env vars. Throws on first access if required vars are missing. */
export function getConfig(): AppConfig {
    if (_config) return _config;
    _config = envSchema.parse(process.env);
    return _config;
}

/** Shorthand — same as getConfig(). */
export const config = new Proxy({} as AppConfig, {
    get(_target, prop: string) {
        return getConfig()[prop as keyof AppConfig];
    },
});

// ────────────────────────────────────────────────
// Constants previously hardcoded across modules
// ────────────────────────────────────────────────

/** The autonomous editor agent wallet on Base Sepolia. */
export const AGENT_WALLET_ADDRESS =
    "0x0D2e1e3bE6A63A08EaF42c69DaD6900a748B8Ed9";

/** Kite AI Photographer Agent address for x402 micropayments. */
export const PHOTOGRAPHER_AGENT_ADDRESS =
    "0x4b2a941929E39Adbea5316dDF2B9Bd8Ff3134389";

/** ERC-8021 builder code for Base analytics tracking. */
export const ERC8021_BUILDER_CODE = "8021:future-express-agent";

/** Base Sepolia USDC contract address. */
export const USDC_CONTRACT_ADDRESS =
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Minimum x402 payment in wei (0.000001 ETH). */
export const MIN_PAYMENT_WEI = BigInt("1000000000000");

/** RPC endpoints. */
export const RPC = {
    BASE_MAINNET: "https://mainnet.base.org",
    BASE_SEPOLIA: "https://sepolia.base.org",
    ZERO_G_TESTNET: "https://evmrpc-testnet.0g.ai",
    KITE_TESTNET: "https://rpc-testnet.gokite.ai/",
    ETH_MAINNET: "https://eth.llamarpc.com",
} as const;

/** 0G official provider addresses. */
export const ZERO_G_PROVIDERS = {
    "llama-3.3-70b-instruct": "0xa48f01287233509FD694a22Bf840225062E67836",
} as const;
