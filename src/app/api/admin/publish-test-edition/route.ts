/**
 * POST /api/admin/publish-test-edition
 *
 * Admin-only manual trigger for the every-4h publish pipeline. Used to
 * verify the Hedera consensus-service wiring end-to-end without waiting
 * for the cron to fire — and without spending real HBAR from a script.
 *
 * Auth: header `x-admin-key` must match `ADMIN_KEY`. Mirrors the digest
 * preview endpoint pattern so ops have a single admin secret to rotate.
 *
 * Behavior:
 *   - Runs `runEditionPipeline()` once. This will:
 *       1. Solvency-check the editor wallet on Base.
 *       2. Create a new edition row.
 *       3. Generate articles.
 *       4. After articles are persisted, submit an `edition_published`
 *          message to Hedera Consensus Service.
 *       5. Persist the resulting Hedera TX id on the edition row.
 *   - Returns the editionId, volume, and hederaTx so the operator can
 *     paste the TX into Hashscan immediately.
 *
 * Cost note: this WILL spend HBAR from `HEDERA_ACCOUNT_ID` on the Hedera
 * testnet (testnet HBAR is free; faucet at https://portal.hedera.com).
 * For mainnet ops, a single message submit costs ~$0.0001 USD.
 *
 * Local-dev hint: this endpoint logs a one-line note when invoked so
 * operators see the wiring is in place even without ADMIN_KEY set.
 */
import { NextRequest, NextResponse } from "next/server";
import { runEditionPipeline } from "@/lib/articles/generate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Edition pipeline is heavy (LLM + DB + Hedera). Allow up to 5 minutes.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    console.warn(
      "[publish-test-edition] ADMIN_KEY not configured — endpoint disabled. " +
        "Hedera wiring is complete; set ADMIN_KEY and call this endpoint to test against testnet.",
    );
    return NextResponse.json(
      { error: "ADMIN_KEY not configured." },
      { status: 401 },
    );
  }

  const provided = req.headers.get("x-admin-key");
  if (provided !== adminKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.warn(
    "[publish-test-edition] Triggering runEditionPipeline manually. " +
      "This will write an edition_published message to Hedera testnet via " +
      "logEditorialDecision() if HEDERA_ACCOUNT_ID + HEDERA_PRIVATE_KEY are set.",
  );

  try {
    const result = await runEditionPipeline();
    return NextResponse.json(
      {
        ok: true,
        editionId: result.editionId,
        volumeNumber: result.volumeNumber,
        articlesGenerated: result.generated,
        articlesFailed: result.failed,
        errors: result.errors,
        hederaTx: result.hederaTx ?? null,
        hashscanUrl: result.hederaTx
          ? `https://hashscan.io/testnet/transaction/${encodeURIComponent(result.hederaTx)}`
          : null,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[publish-test-edition]", err);
    return NextResponse.json(
      { error: "Pipeline failed", details: message },
      { status: 500 },
    );
  }
}
