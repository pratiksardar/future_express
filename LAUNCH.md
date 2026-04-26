# LAUNCH.md — Future Express

**Status:** Engineering canon. **Locked:** 2026-04-26. **Branch:** `saas-main`.

This file supersedes the five research docs in this repo for prioritization. Those docs remain as depth references only — see footer. If a research doc disagrees with this file, this file wins.

---

## 1. The Wedge Frame

The retro 1920s broadsheet aesthetic IS the moat. Growth comes from screenshots, not SEO. Three audiences only — everyone else comes along for free.

- **Wedge B (PRIMARY GROWTH) — Aesthetic / Gen Z / Design Twitter.** Ships screenshots, drives top-of-funnel virality. Every UX decision optimizes for "would this look good on TikTok or in a quote-tweet?"
- **Wedge A (MONETIZATION) — Finance Pros / Journalists.** Pays $9 for real-time refresh, archive, export, ad-free. Will cite us in client memos and tweets if we look serious.
- **Wedge C (PASSIVE) — Degens.** Affiliate kicker via Polymarket/Kalshi referral links. We do not build for them; we collect their clicks.
- **Cut from prioritization:** AI-Enthusiast persona ("Alex") and News-Junkie persona ("Patricia"). They self-select in. Building for them dilutes the wedge.

---

## 2. The Four Growth Loops

### 2.1 Aesthetic Loop (Wedge B — primary)
Screenshot is the unit of growth. Every article surface is a designed share asset.

- **Feeds the loop:** dynamic OG images (`opengraph-image.tsx` reusing `EditorialCard`), TikTok-format playcard (1080x1920), one-tap "Save to Camera Roll", `ShareBar` with platform-tuned previews, mobile typography polish, screenshot-clean article header.
- **Metric:** screenshot-share rate (proxied by direct/social referrers + share button clicks per article view).
- **What NOT to build for this loop:** in-app commenting, threaded replies, user avatars in articles, dark mode, theming options. The aesthetic is fixed. Customization is anti-moat.

### 2.2 Prediction Loop (habit; primary D7 retention driver)
Daily Challenge is a Wordle-shaped habit. Predict 5 markets, share grid, return tomorrow.

- **Feeds the loop:** `DailyChallenge.tsx` as homepage hero on return visits, Wordle-style emoji grid share, accuracy badge follows the user across the app, "I Called It" auto-share on resolved markets, localized 7AM email digest.
- **Metric:** D7 retention; share-of-grid posts on Twitter/Discord.
- **What NOT to build for this loop:** real money betting, managed wallets, tournaments with prizes, comments on predictions, social-graph following. localStorage-only until D7 retention crosses 25%.

### 2.3 Authority Loop (Wedge A — monetization assist + free PR)
Public accuracy. We were right before mainstream media. Receipts get cited, citations drive Wedge A signups.

- **Feeds the loop:** `accuracy.ts` rolling Brier-score badges on every article, public methodology page, "we had it first" auto-receipts on resolved markets, weekly accuracy report card, embed widgets with attribution.
- **Metric:** inbound press citations + embed widget impressions; conversion of cited-traffic to Pro.
- **What NOT to build for this loop:** opinion content, editorial takes, political endorsements, hot-take Twitter posts. Authority means probabilities, never positions. "We don't have opinions. We have probabilities."

### 2.4 Affiliate Loop (Wedge C — passive)
Degens click out to Polymarket/Kalshi. We get paid. Zero new product surface area.

- **Feeds the loop:** UTM-tagged outbound links from market mentions, attribution stored in `analytics_events`, affiliate revenue line on `/pricing`. Existing Uniswap widget stays.
- **Metric:** outbound click-through revenue per 1k article views.
- **What NOT to build for this loop:** on-platform betting, custodial wallets, KYC flows, leaderboards tied to real money, anything that turns us into a regulated product.

---

## 3. Phased Roadmap

Each phase has a gate metric. Miss the gate → pivot, do not push forward.

| Phase | Window | Theme | Gate Metric | Threshold | If Miss |
|-------|--------|-------|-------------|-----------|---------|
| 0 | This week | OG audit + canon | OG card renders correctly across 5 platforms; LAUNCH.md merged | 100% | Stop. Fix OG before any other work. |
| 1 | Weeks 1-2 | Aesthetic launch | New referrers from Twitter + TikTok per day | 200/day sustained for 3 days | Re-shoot TikTok content, swap hero, reconsider headline copy. Do NOT advance. |
| 2 | Weeks 3-4 | Prediction habit | D7 retention on Daily Challenge users | >=25% | Cut Challenge from homepage hero; revisit hook. Skip directly to authority/embeds. |
| 3 | Weeks 5-6 | Monetize | Paid Pro signups | >=50 in 14 days | Drop $9 tier; re-position as donation/founders' pass. Hold off on API tier indefinitely. |
| 4 | Weeks 7-12 | Scale | Inbound API requests + widget installs | 5+ inbound API asks AND 25+ widget installs | Do not build the API tier. Double down on creator partnerships and SEO landing pages instead. |

### Phase 0 — This Week
- OG audit: verify `opengraph-image.tsx` renders correctly on Twitter, Discord, Slack, iMessage, WhatsApp.
- Merge this LAUNCH.md.
- Pick canonical homepage hero (Daily Challenge for returning users; latest edition for first-time).

### Phase 1 — Aesthetic Launch (weeks 1-2)
TikTok content cadence (2-3 posts/day across "Aesthetic Reel" + "Reddit vs Reality" + "Morning Edition"), Product Hunt launch, HN launch, designer Twitter seeding, mobile typography polish, "Save to Camera Roll" on every article, TikTok-format (1080x1920) playcard variant.

### Phase 2 — Prediction Loop Habit (weeks 3-4)
Daily Challenge promoted to homepage hero on return visits, localized 7AM email digest, accuracy badges, "I Called It" auto-share on resolution, Wordle-grid share format. Still no auth — localStorage + signed cookie only.

### Phase 3 — Monetize (weeks 5-6)
$9/month Pro tier: 15-min refresh, ad-free, full archive, CSV data export. Embed widgets seeded to 10 hand-picked finance/politics blogs (we email them). Public methodology page goes live. Affiliate attribution wired into `analytics_events`.

### Phase 4 — Scale (weeks 7-12, one-liners only)
- API tier — only if 5+ inbound asks. Do not build speculatively.
- Prediction Leagues (fantasy-style).
- Category SEO landing pages (`/politics`, `/crypto`, `/sports`).
- Telegram + Discord bot (single binary, posts existing JSON feed).
- Creator partnerships ($2-5K budget, 20 micro-creators, anti-brief approach).

---

## 4. Concrete Tickets (Phase 0 + Phase 1 only)

Phase 2-4 tickets get written when Phase 1's gate clears. Do not pre-spec.

### P0-1: Wire dynamic OG into article pages
- **Owner agent:** frontend-developer
- **Files:** `src/app/article/[slug]/opengraph-image.tsx`, `src/app/article/[slug]/page.tsx`, `src/lib/articles/playcard.tsx`
- **Acceptance:**
  - `generateMetadata()` points OG image URL at the dynamic route, not a generic image.
  - The `EditorialCard` from `playcard.tsx` is the rendered surface, with article-specific headline/odds.
  - Manual verification: paste a production URL into Twitter, Discord, Slack, iMessage, WhatsApp — all five render the playcard.
- **Estimate:** 4 hours.

### P0-2: OG render parity test in CI
- **Owner agent:** backend-architect
- **Files:** `src/app/article/[slug]/opengraph-image.tsx`, new `tests/og.spec.ts` (or add to existing test suite)
- **Acceptance:**
  - Snapshot test of OG image bytes for a known article slug.
  - CI fails if `EditorialCard` props change in a way that breaks render.
  - One-page run-doc for the manual 5-platform check (added to repo `research/` folder).
- **Estimate:** 4 hours.

### P0-3: Pick + ship homepage hero variant
- **Owner agent:** frontend-developer
- **Files:** `src/app/page.tsx`, `src/components/DailyChallenge.tsx`, `src/components/BreakingNewsAlert.tsx`
- **Acceptance:**
  - First-time visitors see the latest edition cover (current behavior).
  - Returning visitors (cookie-based, not auth) see Daily Challenge above the fold.
  - Behind feature flag in `src/lib/flags.ts` for instant rollback.
- **Estimate:** 1 day.

### P1-1: ShareBar with platform-tuned previews
- **Owner agent:** frontend-developer
- **Files:** `src/components/ShareBar.tsx`, `src/app/article/[slug]/page.tsx`
- **Acceptance:**
  - Twitter, Reddit, WhatsApp, Telegram, Copy Link buttons render in this order.
  - Mobile uses Web Share API; desktop uses dropdown.
  - Each platform's intent URL includes the playcard OG, the canonical article URL, and a UTM tag.
- **Estimate:** 1 day.

### P1-2: TikTok-format (1080x1920) playcard variant
- **Owner agent:** frontend-developer
- **Files:** `src/lib/articles/playcard.tsx`, `src/lib/articles/memeCard.tsx`
- **Acceptance:**
  - New `format="tiktok"` prop on `EditorialCard` produces 1080x1920 layout.
  - Typography re-flows for portrait without overflow on long headlines (28-char truncation rule).
  - Available via `?format=tiktok` query on the OG route for in-app save.
- **Estimate:** 1 day.

### P1-3: "Save to Camera Roll" mobile action
- **Owner agent:** frontend-developer
- **Files:** `src/components/ShareBar.tsx`, `src/app/article/[slug]/page.tsx`
- **Acceptance:**
  - On mobile, primary CTA next to share is "Save to Camera Roll".
  - Tap fetches the TikTok-format playcard PNG and triggers `<a download>` with iOS-correct filename.
  - Tracked as `image_saved` event in `analytics_events`.
- **Estimate:** 4 hours.

### P1-4: ODDS SHIFTING badge on movers
- **Owner agent:** backend-architect
- **Files:** `src/lib/articles/trending.ts`, `src/components/ArticleCard.tsx`, `src/lib/db/schema.ts` (`probabilitySnapshots` query only — no schema change)
- **Acceptance:**
  - Query `probabilitySnapshots` for >5pt absolute move in last 24h.
  - Badge renders on `ArticleCard` and inside the article header.
  - Cached for the 4h Inngest cycle; recomputed in `src/inngest/functions.ts` on each edition.
- **Estimate:** 4 hours.

### P1-5: Mobile typography polish
- **Owner agent:** frontend-developer
- **Files:** `src/app/globals.css`, `src/app/article/[slug]/page.tsx`, `src/components/ArticleCard.tsx`
- **Acceptance:**
  - Headline font-size scales correctly down to 360px width without horizontal scroll.
  - Body text 18px minimum on mobile; line-height 1.6.
  - First-paragraph drop-cap survives mobile reflow.
- **Estimate:** 1 day.

### P1-6: TikTok content production kit
- **Owner agent:** content-creator (or external creator partner)
- **Files:** new directory `research/tiktok-kit/` with shot list + brand-safe assets export
- **Acceptance:**
  - 10 pre-recorded "Aesthetic Reel" silent screen-pans of latest editions.
  - 5 "Reddit vs Reality" split-screen templates with text-overlay positioning marked.
  - Posting calendar (2-3 posts/day) for weeks 1-2 with hooks pre-written.
- **Estimate:** 2 days.

### P1-7: Product Hunt + HN launch prep
- **Owner agent:** project-shipper
- **Files:** `research/launch-assets/` (copy + screenshots) — no code changes
- **Acceptance:**
  - PH gallery: 6 screenshots at correct dimensions, hero video 30s.
  - HN post draft (Show HN format) with 3 pre-seeded comment angles.
  - 10 designer Twitter accounts identified for early seeding the morning of launch.
- **Estimate:** 1 day.

---

## 5. Kill List

Features the team will be tempted to build. Defer or cut. One sentence each.

| # | Feature | Why kill |
|---|---------|----------|
| 1 | In-app comments / threaded replies | Hostile to the broadsheet aesthetic; moderation cost is real; share-out to Twitter is the comment thread. |
| 2 | Native iOS/Android app | The web playcard is the asset; an app costs months and adds zero distribution we don't already have via screenshots. |
| 3 | Multi-language / i18n | English-speaking design Twitter is the wedge; localization fragments the share-graph before it forms. |
| 4 | Fine-tuned LLM API ($999 enterprise) | Zero validated demand; pgvector + GPT-4o-mini hits 95% of need; revisit only if we have 3 inbound enterprise asks. |
| 5 | Managed/custodial wallets | Turns us into a regulated product overnight; affiliate links to Polymarket/Kalshi capture the same revenue with zero compliance burden. |
| 6 | NFT prediction certificates | Sounds clever, ships nothing measurable, alienates Wedge A (finance pros) who already think prediction markets are gambling. |
| 7 | Personalized recommendation feed (Phase 1-2) | Premature optimization without auth, and adding auth in Phase 1 kills the screenshot-share funnel. Revisit Phase 4+. |
| 8 | AI chatbot / "ask the editor" assistant | Adds LLM cost per session with no measurable retention lift; users can't articulate why they'd use it. |
| 9 | User accounts for v1 gamification | localStorage + signed cookie covers Daily Challenge through D7. Auth is the right friction at the $9 paywall, not before. |
| 10 | Real-time WebSocket odds streaming | The 4h cadence IS the brand. Real-time live updates is the $9 Pro hook (15-min refresh) — don't give it away free. |
| 11 | Achievement badges / Duolingo streaks | Add only after Daily Challenge proves D7 >= 25%. Building gamification scaffolding pre-validation is sunk cost. |
| 12 | "Quote the Odds" Twitter bot (auto-reply) | Twitter's spam policies make this fragile; one ban kills the account. Prefer human-curated TikTok content. |

---

## 6. Reality Checks (answer before building)

Three questions. If any answer is "no" or "don't know", stop and find out before opening a PR.

1. **Have we talked to 5 actual users in the last 14 days?** Not teammates. Not Twitter polls. Five recorded conversations (Loom or transcript) with people matching Wedge A or Wedge B. If no, run guerrilla Twitter testing per `SPRINT_PLAYBOOK.md` Method 3 today.
2. **What are the live numbers right now?** DAU, share-button click count, Daily Challenge completion rate, Pro signup count, MRR. If we don't have analytics wired (`POST /api/events` from `src/app/api/events/`), that is Phase 0 work and blocks everything else.
3. **Has the OG card been verified in production across all 5 share platforms?** Twitter, Discord, Slack, iMessage, WhatsApp. Not staging. Production. If not, P0-1 is incomplete and Phase 1 cannot start.

---

## 7. Where This Conflicts with Source Docs

This consolidation overrides the source docs. The table below shows where they disagreed and which call won, so the team can audit the synthesis.

| Topic | Viral Plan said | UX Research said | AI Engineering said | TikTok Strategy said | **LAUNCH.md ruling** |
|-------|-----------------|------------------|---------------------|----------------------|----------------------|
| User accounts | "Do NOT add for v1 gamification. localStorage." | Prompt account creation at Phase 3 of journey for personalization. | Required for personalized feed in Week 1-2. | Not addressed. | **Viral Plan wins.** No auth until $9 paywall in Phase 3. |
| Personalized feed timing | Backlog (Month 2+). | Phase 4 (Week 2-4) of journey. | Phase 1 quick-win (Week 1-2). | N/A | **Viral Plan wins.** Phase 4+ at earliest, possibly never. Premature without auth. |
| In-app comments | Not mentioned (excluded by silence). | Implied in "social features" / "follow other users". | "Community" features in API tier. | N/A | **Killed.** Hostile to aesthetic; share-out IS the comment thread. |
| API tier | Backlog item. | Business tier $49/mo from day 1. | Phase 2 (Week 3-4) priority HIGH. | N/A | **Viral Plan wins, hardened.** Build only on 5+ inbound asks. Default = never. |
| Native mobile app | Not in scope. | Not in scope. | Not in scope. | "Add `tiktok` format to playcard" (web feature). | **Killed.** The web playcard distributed via TikTok IS the mobile strategy. |
| Real-time odds | Pro tier feature. | "87% of power users would pay" — Pro gate. | Phase 1 quick-win across all tiers. | N/A | **Viral Plan + UX win.** Real-time = Pro paywall hook, not a free feature. |
| 5-persona model | 3 audiences (degens, finance, mainstream). | 5 personas (Max, Sarah, Jordan, Alex, Patricia). | Not opinionated. | Implicit Gen Z + design + finance. | **Reframed entirely.** 2 active wedges (B primary, A monetization) + 1 passive (C). AI-Enthusiast and News-Junkie cut from prioritization. |
| AI chatbot | Not in scope. | Not in scope. | Phase 1 priority HIGH ("highest ROI feature"). | N/A | **Killed.** No validated demand; LLM cost per session is real and recurring. |
| Phase ordering | Aesthetic -> habit -> monetize -> scale. | Discovery -> aha -> return -> habit -> power user. | AI feature -> monetization -> viral -> advanced AI. | 90-day TikTok ramp (testing -> acceleration -> dominance). | **Viral Plan wins** with TikTok cadence layered into Phase 1. |

---

## 8. References (depth, not prioritization)

The following docs in this repo are background reading. They are NOT to be used to override the rulings in this file. If a research doc and LAUNCH.md disagree, LAUNCH.md is canon.

- `/Users/lemon/future-express/VIRAL_GROWTH_PLAN.md` — most actionable, consolidated from 7 prior agents. Closest to canon.
- `/Users/lemon/future-express/UX_RESEARCH_ANALYSIS.md` — persona depth, journey maps, freemium plan. Use for empathy, not prioritization.
- `/Users/lemon/future-express/AI_ENGINEERING_ANALYSIS.md` — AI implementation code samples. Use as reference when implementing accuracy / threads / memes / what-if.
- `/Users/lemon/future-express/TIKTOK_MARKETING_STRATEGY.md` — content series and 90-day plan. Pull shot lists and hook templates, ignore the 5-pillar over-scope.
- `/Users/lemon/future-express/SPRINT_PLAYBOOK.md` — sprint methodology, user-research methods, retro template. Use as-is.

---

**End of canon.** Owner of this file: project-shipper. Update only when a phase gate is hit or missed.
