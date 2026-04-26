# THE FUTURE EXPRESS -- VIRAL GROWTH MASTER PLAN

**Date:** 2026-03-23 | **Branch:** saas-main
**Compiled from:** 7 specialized agents (Trend Research, TikTok Strategy, UX Design, Frontend Dev, Sprint Prioritization, Backend Architecture, AI Engineering)

---

## THE #1 INSIGHT

The existing playcard generator (`src/lib/articles/playcard.tsx`) already creates gorgeous retro newspaper share cards -- but the OG tags in `src/app/article/[slug]/page.tsx` (line 63) point to generic article images, NOT the playcards. **The best asset in the codebase is invisible to social sharing.** Fixing this is a 2-hour task with the highest ROI of anything on this list.

---

## PRIORITIZED SPRINT PLAN

### SHIP THIS WEEK (Days 1-6) -- Highest Impact, Lowest Effort

| # | Feature | RICE Score | Effort | What to Build |
|---|---------|-----------|--------|---------------|
| 1 | **Dynamic OG Images** | 81.0 | 2hrs | Wire existing `EditorialCard` into `/article/[slug]/opengraph-image.tsx`, update `generateMetadata()` |
| 2 | **One-Click Share Buttons** | 64.0 | 4hrs | `<ShareBar>` component with Twitter/Reddit/WhatsApp/Copy Link, Web Share API on mobile |
| 3 | **"I Called It" Share Cards** | 57.0 | 1.5 days | Gold "CALLED IT" playcard variant, share button on resolved markets |
| 4 | **Trending Indicators** | 42.0 | 4hrs | Query `probabilitySnapshots` for >5pt moves in 24h, "ODDS SHIFTING" badge |
| 5 | **AI Twitter Threads** | 40.0 | 1 day | Auto-generate 6-tweet threads per article with hook/context/data/stakes/contrarian/CTA |
| 6 | **Automated Meme Cards** | HIGH | 1 day | On >20% probability shift, generate meme-style before/after image via `next/og` |

### SHIP NEXT WEEK (Days 7-12)

| # | Feature | Impact | Effort | What to Build |
|---|---------|--------|--------|---------------|
| 7 | **Daily Prediction Challenge** | Very High | 3 days | Wordle-style: 5 markets/day, predict up/down, share grid result |
| 8 | **Contrarian AI (Expanded)** | High | 1 day | Full contrarian arguments with thesis, risks, historical precedent |
| 9 | **Push Notifications** | Medium-High | 2 days | Web Push on >10% probability shifts, breaking news, prediction outcomes |
| 10 | **Real-time Reader Count** | Medium | 1 day | "X reading now" via Redis/HyperLogLog + SSE or polling |
| 11 | **AI Debate Mode** | High | 2 days | For/Against arguments + user voting + community vs market consensus |

### SHIP IN 2 WEEKS (Days 13-18)

| # | Feature | Impact | Effort | What to Build |
|---|---------|--------|--------|---------------|
| 12 | **Prediction Leaderboard** | High | 2 days | "Society of Oracles" -- Brier scoring with contrarian premium |
| 13 | **Newsletter Referral Rewards** | High | 2 days | Unique referral links, 3-stage funnel (click/signup/activate) |
| 14 | **Embeddable Prediction Widgets** | High | 2 days | iframe + script embed with live odds, "Powered by FE" attribution |
| 15 | **Category SEO Landing Pages** | Medium-High | 1 day | `/politics`, `/crypto`, etc. with unique meta |
| 16 | **Telegram/Discord Bot** | Medium | 1 day | Posts each edition via existing JSON feed |
| 17 | **Weekly Accuracy Report Card** | Medium | 1 day | AI-generated "report card" grading prediction accuracy |

### BACKLOG (Month 2+)

| Feature | Notes |
|---------|-------|
| Prediction Leagues (fantasy-style) | Highest viral potential but highest effort |
| "What If" Scenario Generator | AI speculative futures from market data |
| Personalized Prediction Feed | Reading history-based recommendations |
| Time Capsule (sealed predictions) | Long-term engagement, reveal on resolution |
| Achievement Badges | After gamification loop is proven |
| Prediction Streaks (Duolingo-style) | After Daily Challenge proves habit loop |
| Token-gated predictions | After core audience established |
| NFT prediction certificates | After Web3 audience proven |
| "Quote the Odds" Twitter Bot | @futureexpress bot replying with odds cards |
| Pundit Scorecards | Track TV pundits vs market accuracy |

---

## TECHNICAL ARCHITECTURE

### New Database Tables Required

```
users                    -- Auth, referral codes, push subscriptions, streaks
user_predictions         -- Direction + probability at prediction time
user_stats               -- Materialized accuracy stats, Brier scores
referrals                -- 3-stage funnel (clicked/signed_up/activated) + UTM tracking
daily_challenges         -- 5 markets per day, start/end probabilities
daily_challenge_entries  -- User predictions + scores
notifications            -- Push notification queue with status tracking
analytics_events         -- Viral loop measurement (shares, referrals, predictions)
social_threads           -- Auto-generated Twitter thread content
contrarian_takes         -- Expanded contrarian arguments
debates + debate_votes   -- AI debate mode with community voting
meme_cards               -- Auto-generated meme images on probability shifts
what_if_scenarios        -- Speculative future scenarios
```

### New API Routes

**Predictions & Gamification:**
- `POST /api/predictions` -- Make a prediction
- `GET /api/predictions/me` -- User's prediction history
- `GET /api/leaderboard` -- Top 100 by accuracy
- `GET /api/daily-challenge/today` -- Today's 5 markets
- `POST /api/daily-challenge/submit` -- Submit predictions
- `GET /api/daily-challenge/results/:date` -- Past results

**Social & Sharing:**
- `GET /api/threads/[articleId]` -- Twitter thread content
- `GET /api/memes/latest` -- Latest meme cards
- `GET /api/memes/[id]/image` -- Meme image
- `GET /api/debates/[id]/vote` -- Vote on debate

**Growth Infrastructure:**
- `POST /api/referrals/track` -- Track referral clicks
- `GET /api/referrals/me/dashboard` -- Referrer stats
- `POST /api/notifications/subscribe` -- Web Push registration
- `POST /api/analytics/events` -- Batch event ingestion
- `GET /api/stream/live` -- SSE for real-time updates

**Distribution:**
- `GET /embed/[slug]` -- Embeddable iframe widget
- `GET /api/v1/embed/[slug]` -- JSON for script-based embed

### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `ShareBar` | Client | Web Share API + desktop dropdown fallback |
| `SocialProof` | Client | Live reader count + sentiment voting |
| `DebateCard` | Client | For/Against + voting + consensus comparison |
| `CalledItBanner` | Client | Victory notification on resolved predictions |
| `PredictionInput` | Client | Make prediction panel on articles |
| `DailyChallengeCard` | Client | Challenge UI with up/down buttons |
| `ReadingTracker` | Client | IntersectionObserver for scroll depth tracking |

### Infrastructure Requirements

- **Redis (Upstash)** -- Presence counters, rate limiting, analytics buffering, SSE pub/sub
- **web-push npm package** -- Browser push notifications
- **VAPID keys** -- Environment variables for push auth
- No other new dependencies needed -- everything builds on existing `next/og`, Drizzle, Inngest, Hono

---

## TIKTOK STRATEGY (0 to 100K followers in 90 days)

### 5 Content Series

1. **"The Morning Edition"** -- Daily 15-30sec face-to-camera + screen recording (weekdays 7AM EST)
2. **"Reddit vs Reality"** -- Split-screen Reddit confidence vs actual market odds (3x/week)
3. **"The Aesthetic Reel"** -- Silent panning screen recordings with moody music (2x/week)
4. **"I Called It"** -- Proof-of-prediction with receipts (on every major resolution)
5. **"The Editor's Desk"** -- Behind-the-scenes, building in public (1-2x/week)

### Posting Cadence

| Phase | Weeks | Posts/Day | Goal |
|-------|-------|-----------|------|
| Testing | 1-4 | 2-3 | Find 2 formats that break 50K views |
| Acceleration | 5-8 | 3-4 | 25K followers, one 500K+ video |
| Dominance | 9-12 | 4-5 | 100K followers, multiple 1M+ videos |

### Creator Partnerships ($2-5K total budget)

- Target: 20 micro-creators (15K-100K followers) across finance, design, news, tech, crypto niches
- Use "anti-brief" approach: send the product, let them create freely
- Stagger 8-10 partnerships across 2 weeks starting Day 22

### Product Features for TikTok

- Add `tiktok` format (1080x1920) to existing playcard generator
- Animated MP4 variant with typewriter headline effect
- One-tap "Save to Camera Roll" on every article
- "Duet-mode" article cards (left half article, right half blank for reactions)

---

## GROWTH LOOP ARCHITECTURE

### Primary Loop: Content -> Share -> Discover -> Predict

```
AI generates article with market data
  -> User reads, makes prediction
    -> App generates shareable prediction card (retro aesthetic)
      -> User shares on Twitter/TikTok/Reddit
        -> New user sees card, clicks through
          -> Reads article, makes their own prediction
            -> LOOP REPEATS
```

### Secondary Loop: Accuracy -> Authority -> Media -> Users

```
FE predicts event before mainstream media
  -> Publishes "we had it first" receipt
    -> Journalists notice and cite FE
      -> Media coverage drives traffic
        -> More users -> more data -> more accuracy
```

### Tertiary Loop: API -> Developers -> Apps -> Users

```
Developer discovers FE API
  -> Builds app/bot/widget using FE data
    -> Displays "Powered by Future Express"
      -> App users discover FE brand
        -> Some become direct users
```

---

## VIRAL COEFFICIENT MEASUREMENT

Track these events to compute K-factor:

| Event | Viral Loop Stage |
|-------|-----------------|
| `page_view` | Acquisition |
| `signup_completed` | Acquisition |
| `prediction_made` | Activation |
| `article_shared` | Referral (outbound) |
| `i_called_it_shared` | Referral (highest potential) |
| `referral_link_clicked` | Referral (inbound) |
| `push_notification_clicked` | Retention |
| `daily_challenge_streak` | Retention |

**K-factor = (avg shares per user) x (conversion rate per share)**
**Target: K > 1.0 = organic viral growth**

---

## CRITICAL RULES

1. **OG images MUST ship before share buttons.** Without good previews, share buttons drive traffic to ugly link cards.
2. **Do NOT add user accounts for v1 gamification.** localStorage is sufficient. Auth kills growth.
3. **Do NOT over-engineer trending.** "Moved >5 points in 24h" beats an ML model that ships in 3 weeks.
4. **The retro newspaper aesthetic IS the growth asset.** Every feature should reinforce it, not dilute it.
5. **Test OG cards on Twitter, Discord, Slack, iMessage, WhatsApp** -- each renders differently.
6. **Never take political sides.** "We don't have opinions. We have probabilities."
7. **Feature flag everything** via existing `src/lib/flags.ts` for incremental rollout.

---

## COST ESTIMATES

| Category | Monthly Cost |
|----------|-------------|
| AI features (threads, contrarian, debates, memes, reports) | ~$270/mo with GPT-4o-mini, $0 with free OpenRouter models |
| Redis (Upstash) | ~$10/mo on free/hobby tier |
| Push notifications (web-push) | $0 (self-hosted VAPID) |
| TikTok creator partnerships | $2-5K one-time |
| Total infrastructure | ~$280/mo |

---

## WHAT TO BUILD FIRST (TODAY)

1. Create `src/app/article/[slug]/opengraph-image.tsx` -- reuse existing `EditorialCard`
2. Update `generateMetadata()` in `src/app/article/[slug]/page.tsx` to use dynamic OG
3. Build `<ShareBar>` component with Twitter/Reddit/WhatsApp/Copy Link
4. Add "ODDS SHIFTING" badge to articles with >5pt probability movement

**These 4 changes can ship today and immediately improve every link shared from the platform.**
