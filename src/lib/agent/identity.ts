/**
 * Agent identity — server-side data loader for the autonomous editor's
 * on-chain receipt. Powers AgentIdentityStrip (every page) and
 * /transparency (full receipt).
 *
 * Pulls:
 *   - ETH balance on Base (mainnet or sepolia, gated by USE_BASE_SEPOLIA)
 *     via the existing ethers helper used by the publishing-gate cron.
 *   - Most recent Hedera Consensus Service transaction. We look this up
 *     DB-FIRST (the editions table is the canonical store, populated by
 *     the publish pipeline post-persistence) and fall back to the
 *     public Hedera mirror node when the DB has no TX yet (cold start,
 *     fresh DB, or a publish ran before the Hedera wiring was deployed).
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
import { desc, isNotNull } from "drizzle-orm";
import { config, RPC, AGENT_WALLET_ADDRESS } from "@/lib/config";
import { db } from "@/lib/db";
import { editions } from "@/lib/db/schema";

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

/**
 * Parse a Hedera transaction id we wrote to the DB (canonical form
 * `0.0.PAYER@SECONDS.NANOS`) back into a unix-seconds timestamp.
 */
function unixSecondsFromTxId(txId: string): number | null {
  const at = txId.indexOf("@");
  if (at === -1) return null;
  const tail = txId.slice(at + 1);
  const dot = tail.indexOf(".");
  const seconds = dot === -1 ? tail : tail.slice(0, dot);
  const n = parseInt(seconds, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * DB-first Hedera lookup: read the most recent edition with a non-null
 * hedera_tx. This is the canonical record of what we published — faster
 * than the mirror node and not subject to mirror propagation delay.
 *
 * Returns null when the table has no rows yet (cold start) so callers
 * can fall through to mirror-node lookup.
 */
async function fetchLatestHederaTxFromDb(): Promise<{
  txId: string;
  unixSeconds: number;
  explorerNetwork: "mainnet" | "testnet";
} | null> {
  try {
    const [row] = await db
      .select({
        hederaTx: editions.hederaTx,
        hederaPublishedAt: editions.hederaPublishedAt,
      })
      .from(editions)
      .where(isNotNull(editions.hederaTx))
      .orderBy(desc(editions.hederaPublishedAt))
      .limit(1);

    if (!row?.hederaTx) return null;

    const tsFromTx = unixSecondsFromTxId(row.hederaTx);
    const tsFromCol = row.hederaPublishedAt
      ? Math.floor(row.hederaPublishedAt.getTime() / 1000)
      : null;

    return {
      txId: row.hederaTx,
      unixSeconds: tsFromTx ?? tsFromCol ?? nowSec(),
      // Our Hedera client uses Client.forTestnet(); flip when we move ops
      // to mainnet (track via env if/when that happens).
      explorerNetwork: "testnet",
    };
  } catch (e) {
    console.warn(
      "[agent/identity] DB hedera lookup failed:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

async function fetchLatestHederaTxFromMirror(): Promise<{
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

  // If we have a topic id, scope the lookup to that topic — much more
  // accurate than "any message from this account". Falls back to
  // account-level lookup when HEDERA_TOPIC_ID is not set.
  const topicId = process.env.HEDERA_TOPIC_ID?.trim();
  const url = topicId
    ? `https://${mirrorHost}/api/v1/topics/${encodeURIComponent(topicId)}/messages?order=desc&limit=1`
    : `https://${mirrorHost}/api/v1/topics/messages?account.id=${encodeURIComponent(
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

  // DB-first: the editions table is canonically what we published. Faster
  // than the mirror node and immune to mirror propagation lag.
  try {
    const fromDb = await fetchLatestHederaTxFromDb();
    if (fromDb) {
      hederaTx = fromDb.txId;
      hederaTimestamp = fromDb.unixSeconds;
      hederaExplorerUrl = hederaExplorerFor(fromDb.txId, fromDb.explorerNetwork);
    }
  } catch (e) {
    console.warn(
      "[agent/identity] DB hedera lookup threw:",
      e instanceof Error ? e.message : e,
    );
  }

  // Mirror-node fallback for cold start (no editions row with a TX yet).
  if (!hederaTx) {
    try {
      const hh = await fetchLatestHederaTxFromMirror();
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

/**
 * Build a Hashscan transaction URL for a given Hedera transaction id.
 * Currently hardcodes testnet to match Client.forTestnet() in the Hedera
 * client; flip when we move ops to mainnet.
 */
export function hashscanUrlForTx(tx: string | null): string | null {
  return hederaExplorerFor(tx, "testnet");
}

/**
 * List the most recent N editions with non-null Hedera TX. Used by the
 * /transparency page's "Log of editions" section. Returns chronologically
 * descending (newest first). Tolerant to DB failure — returns [] on error.
 */
export type EditionLogEntry = {
  editionId: string;
  volumeNumber: number | null;
  hederaTx: string;
  hederaPublishedAt: Date | null;
  hashscanUrl: string;
};

export async function listRecentEditionTxs(limit = 10): Promise<EditionLogEntry[]> {
  try {
    const rows = await db
      .select({
        id: editions.id,
        volumeNumber: editions.volumeNumber,
        hederaTx: editions.hederaTx,
        hederaPublishedAt: editions.hederaPublishedAt,
      })
      .from(editions)
      .where(isNotNull(editions.hederaTx))
      .orderBy(desc(editions.hederaPublishedAt))
      .limit(limit);

    const result: EditionLogEntry[] = [];
    for (const row of rows) {
      if (!row.hederaTx) continue;
      const url = hashscanUrlForTx(row.hederaTx);
      if (!url) continue;
      result.push({
        editionId: row.id,
        volumeNumber: row.volumeNumber ?? null,
        hederaTx: row.hederaTx,
        hederaPublishedAt: row.hederaPublishedAt ?? null,
        hashscanUrl: url,
      });
    }
    return result;
  } catch (e) {
    console.warn(
      "[agent/identity] listRecentEditionTxs failed:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}
