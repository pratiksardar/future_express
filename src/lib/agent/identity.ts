/**
 * Agent identity — server-side data loader for the autonomous editor's
 * on-chain receipt. Powers AgentIdentityStrip (every page) and
 * /transparency (full receipt).
 *
 * Pulls:
 *   - ETH balance on Base (mainnet or sepolia, gated by USE_BASE_SEPOLIA)
 *     via the existing ethers helper used by the publishing-gate cron.
 *   - Most recent Hedera Consensus Service message published by the
 *     configured HEDERA_ACCOUNT_ID, queried from the public mirror node.
 *
 * Resilience:
 *   - 60s in-process TTL cache so /, /article/*, /transparency don't all
 *     trigger an RPC roundtrip on every render.
 *   - On RPC failure we return the last-known snapshot with stale=true.
 *     If we have no last-known we fall back to safe defaults so the UI
 *     never crashes.
 *   - If env vars are unset (dev without secrets) we still return a
 *     well-formed AgentIdentity so the strip renders.
 */
import { ethers } from "ethers";
import { config, RPC, AGENT_WALLET_ADDRESS } from "@/lib/config";

export type AgentIdentity = {
  email: string;
  walletAddress: string;
  balanceEth: string;
  balanceWei: string;
  network: "base" | "base-sepolia";
  hederaTx: string | null;
  hederaTimestamp: number | null;
  basescanUrl: string;
  hederaExplorerUrl: string | null;
  fetchedAt: number;
  stale?: boolean;
};

const STATIC_EMAIL = "editor@futureexpress.eth";
const PLACEHOLDER_WALLET = "0x0000000000000000000000000000000000000000";
const TTL_MS = 60_000;
const RPC_TIMEOUT_MS = 4_000;
const MIRROR_TIMEOUT_MS = 4_000;

type CacheEntry = { value: AgentIdentity; expiresAt: number };
let cached: CacheEntry | null = null;
let lastKnown: AgentIdentity | null = null;
let inflight: Promise<AgentIdentity> | null = null;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function basescanForNetwork(
  address: string,
  network: "base" | "base-sepolia",
): string {
  const host =
    network === "base-sepolia" ? "sepolia.basescan.org" : "basescan.org";
  return `https://${host}/address/${address}`;
}

function hederaExplorerFor(
  tx: string | null,
  network: "mainnet" | "testnet",
): string | null {
  if (!tx) return null;
  return `https://hashscan.io/${network}/transaction/${encodeURIComponent(tx)}`;
}

/** Format an ethers v6 wei (bigint) into "0.0341"-ish string (4 dp, trimmed). */
function formatBalance(wei: bigint): string {
  const raw = ethers.formatEther(wei); // "0.034123..."
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  if (num === 0) return "0.0000";
  // 4 dp keeps it "screenshot-bait" precise without overwhelming the strip.
  return num.toFixed(4);
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  try {
    return await Promise.race([p, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchBaseBalance(
  address: string,
): Promise<{ balanceWei: bigint; network: "base" | "base-sepolia" }> {
  const useSepolia = config.USE_BASE_SEPOLIA;
  const network: "base" | "base-sepolia" = useSepolia ? "base-sepolia" : "base";
  const rpc =
    config.BASE_RPC_URL ?? (useSepolia ? RPC.BASE_SEPOLIA : RPC.BASE_MAINNET);
  const provider = new ethers.JsonRpcProvider(rpc);
  const balanceWei = await withTimeout(
    provider.getBalance(address),
    RPC_TIMEOUT_MS,
    "base rpc getBalance",
  );
  return { balanceWei, network };
}

type HederaMirrorMessage = {
  consensus_timestamp?: string; // "1714169643.391284561"
  payer_account_id?: string; // "0.0.7976309"
  topic_id?: string; // "0.0.4928421"
  sequence_number?: number;
};

type HederaMirrorResponse = {
  messages?: HederaMirrorMessage[];
};

/**
 * Hedera "transaction id" canonical form is `<payer>@<seconds>.<nanos>`.
 * The mirror node returns consensus timestamps as `<seconds>.<nanos>`.
 * We synthesize the display TX id from the payer account + timestamp,
 * which is what hashscan accepts in its transaction URL.
 */
function buildHederaTxId(
  payer: string,
  consensusTs: string,
): { txId: string; unixSeconds: number } | null {
  if (!payer || !consensusTs) return null;
  const dot = consensusTs.indexOf(".");
  const seconds = dot === -1 ? consensusTs : consensusTs.slice(0, dot);
  const nanos = dot === -1 ? "0" : consensusTs.slice(dot + 1);
  const unixSeconds = parseInt(seconds, 10);
  if (!Number.isFinite(unixSeconds)) return null;
  // Hedera TX id format: 0.0.X@SECONDS.NANOS
  const txId = `${payer}@${seconds}.${nanos}`;
  return { txId, unixSeconds };
}

async function fetchLatestHederaTx(): Promise<{
  txId: string;
  unixSeconds: number;
  explorerNetwork: "mainnet" | "testnet";
} | null> {
  const accountId = process.env.HEDERA_ACCOUNT_ID?.trim();
  if (!accountId) return null;

  // Our Hedera client uses Client.forTestnet(); use testnet mirror to find
  // its messages. If we ever flip to mainnet we can switch on an env flag.
  const useTestnet = true;
  const mirrorHost = useTestnet
    ? "testnet.mirrornode.hedera.com"
    : "mainnet-public.mirrornode.hedera.com";
  const explorerNetwork: "mainnet" | "testnet" = useTestnet
    ? "testnet"
    : "mainnet";

  // Filter messages by payer (our account) ordered by newest first.
  const url = `https://${mirrorHost}/api/v1/topics/messages?account.id=${encodeURIComponent(
    accountId,
  )}&order=desc&limit=1`;

  const res = await withTimeout(
    fetch(url, { headers: { accept: "application/json" } }),
    MIRROR_TIMEOUT_MS,
    "hedera mirror node",
  );
  if (!res.ok) {
    throw new Error(`Hedera mirror returned ${res.status}`);
  }
  const data = (await res.json()) as HederaMirrorResponse;
  const first = data.messages?.[0];
  if (!first?.consensus_timestamp || !first.payer_account_id) return null;

  const built = buildHederaTxId(
    first.payer_account_id,
    first.consensus_timestamp,
  );
  if (!built) return null;
  return { ...built, explorerNetwork };
}

function safeFallback(reason: "no-env" | "rpc-error"): AgentIdentity {
  const useSepolia = config.USE_BASE_SEPOLIA;
  const network: "base" | "base-sepolia" = useSepolia ? "base-sepolia" : "base";
  const fallbackAddress = config.EDITOR_WALLET_ADDRESS?.trim() || AGENT_WALLET_ADDRESS;
  const address =
    reason === "no-env" && !config.EDITOR_WALLET_ADDRESS?.trim()
      ? PLACEHOLDER_WALLET
      : fallbackAddress;
  return {
    email: STATIC_EMAIL,
    walletAddress: address,
    balanceEth: "0.0000",
    balanceWei: "0",
    network,
    hederaTx: null,
    hederaTimestamp: null,
    basescanUrl: basescanForNetwork(address, network),
    hederaExplorerUrl: null,
    fetchedAt: nowSec(),
    stale: reason === "rpc-error",
  };
}

async function loadFresh(): Promise<AgentIdentity> {
  const rawAddress = config.EDITOR_WALLET_ADDRESS?.trim();
  if (!rawAddress) {
    return safeFallback("no-env");
  }

  // Resolve ENS / Basenames using mainnet Ethereum RPC (parity with the
  // publishing-gate helper in editorWallet.ts).
  let address = rawAddress;
  if (rawAddress.endsWith(".eth")) {
    try {
      const mainnetProvider = new ethers.JsonRpcProvider(RPC.ETH_MAINNET);
      const resolved = await withTimeout(
        mainnetProvider.resolveName(rawAddress),
        RPC_TIMEOUT_MS,
        "ens resolve",
      );
      if (resolved) address = resolved;
    } catch {
      // Fall through with the raw .eth name; balance call will likely fail
      // and we'll bail to safeFallback below.
    }
  }

  let balanceWei = BigInt(0);
  let network: "base" | "base-sepolia" = config.USE_BASE_SEPOLIA
    ? "base-sepolia"
    : "base";
  let baseError: unknown = null;

  try {
    const result = await fetchBaseBalance(address);
    balanceWei = result.balanceWei;
    network = result.network;
  } catch (e) {
    baseError = e;
    console.warn(
      "[agent/identity] Base balance fetch failed:",
      e instanceof Error ? e.message : e,
    );
  }

  let hederaTx: string | null = null;
  let hederaTimestamp: number | null = null;
  let hederaExplorerUrl: string | null = null;
  try {
    const hh = await fetchLatestHederaTx();
    if (hh) {
      hederaTx = hh.txId;
      hederaTimestamp = hh.unixSeconds;
      hederaExplorerUrl = hederaExplorerFor(hh.txId, hh.explorerNetwork);
    }
  } catch (e) {
    console.warn(
      "[agent/identity] Hedera mirror fetch failed:",
      e instanceof Error ? e.message : e,
    );
  }

  // If Base RPC failed and we have a last-known good, surface it stale.
  if (baseError && lastKnown) {
    return { ...lastKnown, stale: true, fetchedAt: nowSec() };
  }

  const snapshot: AgentIdentity = {
    email: STATIC_EMAIL,
    walletAddress: address,
    balanceEth: formatBalance(balanceWei),
    balanceWei: balanceWei.toString(),
    network,
    hederaTx,
    hederaTimestamp,
    basescanUrl: basescanForNetwork(address, network),
    hederaExplorerUrl,
    fetchedAt: nowSec(),
    stale: baseError != null,
  };

  if (!snapshot.stale) lastKnown = snapshot;
  return snapshot;
}

/**
 * Public entrypoint. Cached for 60s; concurrent callers share the same
 * inflight promise. On any unexpected error we surface lastKnown if we
 * have one, otherwise a safe fallback.
 */
export async function getAgentIdentity(): Promise<AgentIdentity> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const value = await loadFresh();
      cached = { value, expiresAt: Date.now() + TTL_MS };
      return value;
    } catch (e) {
      console.warn(
        "[agent/identity] loadFresh threw, using fallback:",
        e instanceof Error ? e.message : e,
      );
      if (lastKnown) {
        const stale: AgentIdentity = { ...lastKnown, stale: true };
        cached = { value: stale, expiresAt: Date.now() + TTL_MS };
        return stale;
      }
      const fb = safeFallback("rpc-error");
      cached = { value: fb, expiresAt: Date.now() + TTL_MS };
      return fb;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** For tests / SSR pages that want to bypass cache once. */
export function __resetAgentIdentityCacheForTests(): void {
  cached = null;
  lastKnown = null;
  inflight = null;
}

/**
 * Format a Hedera TX id (`0.0.X@SECONDS.NANOS`) into a narrow-viewport-
 * friendly form: `0.0.X@…NANOS_TAIL`. Used by the strip on mobile.
 */
export function truncateHederaTx(tx: string, tailLen = 9): string {
  const at = tx.indexOf("@");
  if (at === -1) return tx;
  const head = tx.slice(0, at); // "0.0.X"
  const rest = tx.slice(at + 1);
  if (rest.length <= tailLen) return tx;
  return `${head}@…${rest.slice(-tailLen)}`;
}
