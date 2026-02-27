/**
 * Future Express — Simple Feature Flags
 * 
 * Controls rollout of new features (e.g., Uniswap v3 migrations, new LLM providers, beta tools)
 * without needing a code deployment. Uses Environment variables right now but could
 * be expanded into an Edge Config or LaunchDarkly client.
 */

interface FeatureFlags {
    ENABLE_BETA_UI: boolean;
    ENABLE_AUTOMATED_BREAKING_EDITIONS: boolean;
    MOCK_X402_PAYMENTS: boolean;
    USE_FALLBACK_IMAGE_API: boolean;
}

const defaultFlags: FeatureFlags = {
    ENABLE_BETA_UI: process.env.NEXT_PUBLIC_FF_BETA_UI === 'true',
    ENABLE_AUTOMATED_BREAKING_EDITIONS: process.env.FF_AUTOMATED_BREAKING === 'true',
    // Used for tests/demos to bypass kite micropayments on chain
    MOCK_X402_PAYMENTS: process.env.FF_MOCK_X402 === 'true',
    // If OpenRouter payload image inference fails, immediately fallback to Pollinations
    USE_FALLBACK_IMAGE_API: process.env.FF_FALLBACK_IMAGE_API !== 'false',
};

/**
 * Check if a specific feature flag is toggled on.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
    return defaultFlags[flag] ?? false;
}

/**
 * Returns all active state flags (useful for exposing to the React frontend).
 */
export function getFrontendFlags() {
    return {
        ENABLE_BETA_UI: isFeatureEnabled("ENABLE_BETA_UI"),
    };
}
