/**
 * Edge middleware — captures referral codes from URL query params.
 *
 * When a visitor lands on any non-API page with `?ref=<code>` we:
 *   1. Set an HttpOnly, SameSite=Lax cookie `tfe_ref=<code>` (30 days).
 *      The cookie persists if the visitor browses around before signing up
 *      so attribution still works on the eventual `/api/subscribe` POST.
 *   2. Fire-and-forget POST `/api/referrals/track` so the click is recorded
 *      against the referrer's funnel even if the visitor never subscribes.
 *
 * Why middleware instead of layout? Cookies set in a server-component layout
 * are tricky in Next 16 (must use the Cookies API in a Route Handler), and
 * we want the cookie to be present on the same response that delivered the
 * HTML — middleware is the canonical surface for this.
 *
 * Edge runtime constraints:
 *   - No Node `crypto` here. We do NOT validate the code shape strictly;
 *     `/api/referrals/track` re-validates on the server side (Node runtime).
 *   - We can't await the fire-and-forget fetch — but `waitUntil` works on
 *     Vercel's edge to keep the runtime alive past response.
 */
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "tfe_ref";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_COOKIE_NAME = "tfe_session_id";

// Permissive shape check (we intentionally don't import the strict validator
// — middleware is in the edge runtime and the validator lives in node code).
const REF_CODE_SHAPE = /^[A-Za-z0-9]{6,16}$/;

function maybeGenerateSessionId(): string {
  // crypto.randomUUID is available in the Edge runtime.
  return crypto.randomUUID();
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const ref = url.searchParams.get("ref");

  // Without a ref we still want to ensure the visitor has a stable session id
  // for click dedup. Skip cookie work entirely on API/asset paths to keep the
  // middleware overhead near zero.
  const res = NextResponse.next();

  // Ensure session cookie exists on every page hit.
  const existingSession = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!existingSession) {
    res.cookies.set(SESSION_COOKIE_NAME, maybeGenerateSessionId(), {
      httpOnly: false, // client-side challenge UI reads/writes the same key in localStorage
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (!ref || !REF_CODE_SHAPE.test(ref)) {
    return res;
  }

  // Set the persistence cookie so a delayed signup still attributes correctly.
  res.cookies.set(COOKIE_NAME, ref, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  // Fire-and-forget click track. We don't `await` — middleware needs to keep
  // the response fast. On Vercel `waitUntil` would keep the function alive
  // past response; in plain Next dev the fetch still goes through reliably.
  const sessionId = existingSession ?? "";
  if (sessionId) {
    const origin = url.origin;
    const utmSource = url.searchParams.get("utm_source");
    const utmMedium = url.searchParams.get("utm_medium");
    const utmCampaign = url.searchParams.get("utm_campaign");
    void fetch(`${origin}/api/referrals/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass through real client IP/user-agent so the API can hash + log them.
        "X-Forwarded-For":
          req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "",
        "User-Agent": req.headers.get("user-agent") ?? "",
      },
      body: JSON.stringify({
        code: ref,
        sessionId,
        utm: {
          source: utmSource,
          medium: utmMedium,
          campaign: utmCampaign,
        },
      }),
      // Edge fetch needs an explicit cache directive to avoid 'force-cache'.
      cache: "no-store",
    }).catch(() => {
      // Swallow errors — click tracking is best-effort.
    });
  }

  return res;
}

/**
 * Match every page route, but skip Next internal assets, API routes (so we
 * don't recursively call ourselves through `/api/referrals/track`), and
 * static files. The matcher syntax follows the docs at
 * https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher.
 */
export const config = {
  matcher: [
    // Exclude:
    //  - /api/*       (the click tracker is itself an /api/* call)
    //  - /_next/*     (HMR + chunks)
    //  - /widget/*    (embeddable widgets must not get cookies set on them)
    //  - any path with a file extension (favicon.ico, robots.txt, *.png, …)
    "/((?!api/|_next/|widget/|.*\\..*).*)",
  ],
};
