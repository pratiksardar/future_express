/**
 * Server-side Uniswap Trading API client for quote and swap on Base.
 * @see https://api-docs.uniswap.org/introduction
 * @see https://api-docs.uniswap.org/guides/swapping
 */

const API_BASE = "https://trade-api.gateway.uniswap.org/v1";

export type QuoteParams = {
  tokenIn: string;
  tokenOut: string;
  tokenInChainId: number;
  tokenOutChainId: number;
  amount: string;
  swapper: string;
  type?: "EXACT_INPUT" | "EXACT_OUTPUT";
  slippageTolerance?: number;
  routingPreference?: "BEST_PRICE" | "FASTEST";
};

export type QuoteResponse = {
  requestId?: string;
  quote: unknown;
  routing: string;
  permitData: unknown;
  permitTransaction?: unknown;
};

export type CreateSwapParams = {
  quote: unknown;
  signature?: string;
  permitData?: unknown;
};

export type CreateSwapResponse = {
  swap: {
    to: string;
    value: string;
    data: string;
    gas: string;
    chainId: number;
  };
};

function getHeaders(): HeadersInit {
  const key = process.env.UNISWAP_API_KEY;
  if (!key) {
    throw new Error("UNISWAP_API_KEY is not set");
  }
  return {
    "Content-Type": "application/json",
    "x-api-key": key,
  };
}

/**
 * Get a swap quote from the Uniswap Trading API.
 */
export async function getQuote(params: QuoteParams): Promise<QuoteResponse> {
  const body = {
    type: params.type ?? "EXACT_INPUT",
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    tokenInChainId: params.tokenInChainId,
    tokenOutChainId: params.tokenOutChainId,
    amount: params.amount,
    swapper: params.swapper,
    routingPreference: params.routingPreference ?? "BEST_PRICE",
    ...(params.slippageTolerance != null
      ? { slippageTolerance: params.slippageTolerance }
      : { autoSlippage: "DEFAULT" }),
  };

  const res = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      (err as { detail?: string }).detail ?? `Uniswap quote failed: ${res.status}`
    );
  }

  return res.json() as Promise<QuoteResponse>;
}

/**
 * Get swap transaction calldata (for CLASSIC / protocol swap).
 * Caller must sign permitData if present before calling this.
 */
export async function createSwap(
  params: CreateSwapParams
): Promise<CreateSwapResponse> {
  const body: Record<string, unknown> = {
    quote: params.quote,
  };
  if (params.signature != null) body.signature = params.signature;
  if (params.permitData != null) body.permitData = params.permitData;

  const res = await fetch(`${API_BASE}/swap`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      (err as { detail?: string }).detail ?? `Uniswap swap failed: ${res.status}`
    );
  }

  return res.json() as Promise<CreateSwapResponse>;
}
