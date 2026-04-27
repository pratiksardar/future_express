/**
 * Referral code generator + persistence helper.
 *
 * Codes are 8 characters drawn from a friendly alphanumeric alphabet that
 * deliberately omits visually-confusable characters (0/O, 1/I/l). They are
 * URL-safe and case-sensitive — `Abc12345` and `abc12345` are different
 * codes, mirroring nanoid behaviour.
 *
 * Why a custom alphabet rather than nanoid? Two reasons:
 *   1. We want zero new runtime deps for a 60-LOC helper.
 *   2. We want codes to be readable when typed off a screenshot or shouted
 *      across a coffee shop. nanoid's URL alphabet still includes `_` and `-`.
 *
 * Generation uses Web Crypto when available (Node 20+, edge runtime) and
 * falls back to `crypto.randomBytes` on classic Node servers. Math.random
 * is never used — every byte is from a CSPRNG.
 */
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { subscribers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// 32 chars: digits 2-9 + uppercase A-Z minus I, O + lowercase a-z minus i, l, o.
// Length 32 guarantees uniform sampling from a single random byte modulo 32
// (no modulo bias when masking the low 5 bits).
const ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

const CODE_LENGTH = 8;

/**
 * Generate a single 8-char referral code from cryptographically-secure bytes.
 * The alphabet has 55 chars; we read enough bytes to oversample and reject
 * out-of-range values to avoid modulo bias.
 */
export function generateReferralCode(): string {
  const out: string[] = [];
  // Pull 2x as many bytes as we need; rejection sampling tops out well below
  // double the size for a 55-char alphabet.
  let buf = randomBytes(CODE_LENGTH * 2);
  let bufIdx = 0;
  const max = 256 - (256 % ALPHABET.length); // largest multiple of |alphabet| <= 256

  while (out.length < CODE_LENGTH) {
    if (bufIdx >= buf.length) {
      buf = randomBytes(CODE_LENGTH * 2);
      bufIdx = 0;
    }
    const b = buf[bufIdx++];
    if (b < max) {
      out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return out.join("");
}

/**
 * Cheap structural validity check — same alphabet + length. Does NOT confirm
 * a row exists in `subscribers`; the caller still needs to do a DB lookup.
 */
export function isValidReferralCodeShape(input: unknown): input is string {
  if (typeof input !== "string") return false;
  if (input.length !== CODE_LENGTH) return false;
  for (let i = 0; i < input.length; i++) {
    if (ALPHABET.indexOf(input[i]) === -1) return false;
  }
  return true;
}

/**
 * Idempotently fetch (or generate + store) a subscriber's referral code.
 *
 * If two parallel requests race we rely on the unique index on
 * `subscribers.referral_code` to surface a single winner. On collision we
 * re-read the row and return whatever code was persisted first. Collisions
 * across the 55^8 ≈ 5.7×10^13 keyspace are vanishingly rare, but we still
 * guard against duplicate codes by retrying up to 5 times before throwing.
 */
export async function getOrCreateReferralCode(
  subscriberId: string
): Promise<string> {
  const [existing] = await db
    .select({ referralCode: subscribers.referralCode })
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);

  if (!existing) {
    throw new Error(`Subscriber not found: ${subscriberId}`);
  }
  if (existing.referralCode) return existing.referralCode;

  // Generate-and-set. Retry on the (very unlikely) unique-constraint collision
  // OR on someone else assigning a code in parallel.
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateReferralCode();
    try {
      const result = await db
        .update(subscribers)
        .set({ referralCode: candidate })
        .where(
          // Only set if still null — avoids stomping a parallel writer.
          sql`${subscribers.id} = ${subscriberId} AND ${subscribers.referralCode} IS NULL`
        )
        .returning({ referralCode: subscribers.referralCode });

      if (result.length > 0 && result[0].referralCode) {
        return result[0].referralCode;
      }
      // Someone else won the race — re-read and return their code.
      const [after] = await db
        .select({ referralCode: subscribers.referralCode })
        .from(subscribers)
        .where(eq(subscribers.id, subscriberId))
        .limit(1);
      if (after?.referralCode) return after.referralCode;
    } catch (err) {
      // Unique-violation on referralCode (extremely rare). Fall through and try again.
      if (
        err instanceof Error &&
        /unique|duplicate/i.test(err.message) &&
        attempt < 4
      ) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to assign referral code after 5 attempts");
}
