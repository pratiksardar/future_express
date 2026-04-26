# The Future Express — Retro × Modern Design Revamp

A spec for the frontend-developer agent. Implementable in a week. No new design system invented from scratch — we're tightening, sharpening, and adding teeth to the broadsheet identity already in `globals.css`.

---

## 1. Design philosophy

The Future Express is a 1920s broadsheet printed by a machine that lives in 2026. It is **not** a "newspaper-themed SaaS." The retro is the moat — every screen must look like something a stranger would screenshot.

**What stays 1920s:** the column rules, the double-rule dividers, the all-caps masthead with a triple-bordered cartouche, classifieds-style typography, drop caps, oldstyle figures in body copy, italic deks, halftone images, the dignified silence of paper. The grid is real — columns, rules, hierarchy by size and weight, not by color.

**What goes 2026:** variable-font headlines that breathe at different viewports, motion that imitates print (ink settling, type setting, numbers stamping) instead of material rubber-banding, a dark mode that reads like newsprint under a desk lamp, tap targets that respect thumbs, performance budgets that respect data plans, prefers-reduced-motion that respects vestibular systems.

**Governing principle:** *ornament where it earns its place; restraint where it doesn't.* The masthead earns triple borders. A "More Stories" grid does not. The Daily Challenge result earns a dramatic block reveal. A nav link does not. When in doubt, remove the chrome and trust the rule.

The voice is dignified, dry-witted, intellectually confident. Never cute. Never minimalist-Linear-sans-everything. Never gradient.

---

## 2. Token system

These map onto the existing CSS variables in `src/app/globals.css`. This is a swap, not a rewrite. New tokens are additions; existing names are preserved.

### 2.1 Color — Light (`:root`)

```css
:root {
  /* Paper — warm, matte, slightly off-white. Newsprint, not OLED. */
  --color-paper:        #f3ede0;   /* primary surface (slightly warmer) */
  --color-paper-warm:   #ebe3d2;   /* sunken cards, market briefs */
  --color-paper-cream:  #faf6ec;   /* raised cards, callouts */

  /* Ink — three tints, all warm-black, never pure #000 */
  --color-ink:          #1a1714;   /* primary type */
  --color-ink-medium:   #3a352d;   /* body, secondary */
  --color-ink-light:    #6b6356;   /* meta, captions */
  --color-ink-faded:    #968d7d;   /* timestamps, micro */

  /* Rules — thin, medium, thick, double. Broadsheets live here. */
  --color-rule:         #c4b9a8;   /* hairline */
  --color-rule-dark:    #8b7e6e;   /* medium */
  --color-rule-heavy:   #1a1714;   /* thick (= ink) */

  /* Accents — printed in two passes max. Use sparingly. */
  --color-accent-red:   #8b2500;   /* breaking, kicker, error */
  --color-accent-blue:  #1b3a5c;   /* link hover, odds chrome */
  --color-accent-gold:  #b8860b;   /* spot ornament — masthead rule, awards */
  --color-spot-green:   #2d5f2d;   /* "very likely" odds */
  --color-spot-red:     #8b0000;   /* "unlikely" odds */

  /* Semantic (UI states) — same warmth as the paper */
  --color-success:      var(--color-spot-green);
  --color-warning:      #a06a0c;
  --color-error:        var(--color-spot-red);
}
```

### 2.2 Color — Dark (`[data-edition="night"]`)

The brief: *newspaper under a desk lamp.* Warm low-light, paper-like background, ink that's still ink (never pure white). The eye should feel it's reading paper, not staring at a phone.

```css
[data-edition="night"] {
  /* Paper at night — warm graphite, not OLED black */
  --color-paper:        #1f1c17;   /* base — warm dark with brown undertone */
  --color-paper-warm:   #2a2620;   /* sunken */
  --color-paper-cream:  #332e26;   /* raised */

  /* Ink at night — warm cream, never #fff */
  --color-ink:          #ece4d2;
  --color-ink-medium:   #c8bfa9;
  --color-ink-light:    #908875;
  --color-ink-faded:    #5e5849;

  /* Rules at night — slightly higher contrast than day */
  --color-rule:         #4a4439;
  --color-rule-dark:    #6b6453;
  --color-rule-heavy:   #ece4d2;

  /* Accents — desaturated, lit by the lamp */
  --color-accent-red:   #d05a3a;
  --color-accent-blue:  #6a9bc4;
  --color-accent-gold:  #d4a842;
  --color-spot-green:   #6bb86b;
  --color-spot-red:     #d05a5a;
}
```

**Rule:** dark mode is a designed theme, not an inversion. `filter: invert()` is forbidden. Halftone overlays must use `mix-blend-mode: screen` (already done in `globals.css`).

### 2.3 Typography

Confirmed existing stack, refined with feature settings:

```css
/* Existing — keep */
--font-display: var(--font-playfair), Georgia, "Times New Roman", serif;
--font-body:    var(--font-lora),     Charter, Georgia, serif;
--font-sub:     var(--font-newsreader), Georgia, serif;
--font-ui:      var(--font-dm-sans), "Helvetica Neue", Arial, sans-serif;
--font-data:    var(--font-jetbrains), "Courier New", monospace;
```

**Recommendation:** keep Playfair for display. It's loud, broadsheet-correct, and ships. Do **not** swap to a "more modern" sans for headlines — that kills the moat. If we ever swap, swap to a variable serif like *Fraunces* or *Source Serif 4 Variable* for headline weight axis play; otherwise leave it.

**Font-feature-settings (apply globally):**

```css
body                    { font-feature-settings: "kern", "liga", "onum"; }   /* oldstyle figures in body */
.font-display, h1, h2   { font-feature-settings: "kern", "liga", "lnum", "ss01"; } /* lining figs in display */
.tabular, [data-odds]   { font-feature-settings: "tnum", "lnum", "zero"; }   /* tabular lining for odds */
.section-title, .kicker { font-feature-settings: "kern", "smcp", "c2sc"; }   /* small caps where supported */
```

**Variable axes (if we adopt a variable display serif):** expose `--display-wght` (700–900) and `--display-opsz`. Headlines on mobile should drop to `wght 800 opsz 32`; desktop hero gets `wght 900 opsz 96`.

### 2.4 Type scale (mobile-first, 1.25 ratio with editorial overrides)

Token names prefixed `--type-*`. Add to `:root`. Each step is `font-size / line-height / tracking`.

| Token            | Mobile (≤640)  | Desktop (≥1024) | Use                                        |
|------------------|----------------|-----------------|--------------------------------------------|
| `--type-masthead`| 56 / 1.0 / -0.01em | 112 / 0.95 / -0.015em | "THE FUTURE EXPRESS" wordmark only   |
| `--type-display` | 36 / 1.05 / -0.015em | 72 / 1.05 / -0.02em  | Article hero headline, hero card    |
| `--type-h1`      | 28 / 1.1 / -0.01em | 44 / 1.1 / -0.01em   | Section dominants                   |
| `--type-h2`      | 22 / 1.2 / -0.005em | 30 / 1.2 / -0.005em | Card headlines                      |
| `--type-h3`      | 18 / 1.3 / 0       | 22 / 1.3 / 0        | Compact cards, sidebar                |
| `--type-dek`     | 17 / 1.4 / 0  italic | 21 / 1.4 / 0 italic | Subhead, italicized in `--font-sub` |
| `--type-body`    | 17 / 1.62 / 0      | 18 / 1.65 / 0       | Article body                          |
| `--type-meta`    | 13 / 1.4 / 0.06em uppercase | 13 / 1.4 / 0.06em | Bylines, timestamps         |
| `--type-kicker`  | 11 / 1.2 / 0.18em uppercase | 11 / 1.2 / 0.20em | Section labels, small caps  |
| `--type-micro`   | 10 / 1.3 / 0.20em  | 10 / 1.3 / 0.20em   | Volume/issue, classifieds             |

**Mobile body rule:** never below 17px. This is a reading product. Default Tailwind `text-base` (16px) is too small for prose.

### 2.5 Spacing — keep existing, add three

Existing `--space-1` through `--space-9` are kept. Additions:

```css
--space-rule:     1px;     /* hairline rule offset */
--space-gutter:   24px;    /* column gutter (replaces hardcoded --column-gap) */
--space-bleed:    -16px;   /* used for full-bleed dark callouts on mobile */
```

### 2.6 Rule lines (the broadsheet's spine)

```css
--rule-hair:      1px solid var(--color-rule);
--rule-thin:      1px solid var(--color-rule-dark);
--rule-medium:    2px solid var(--color-ink);
--rule-thick:     4px solid var(--color-ink);
--rule-double:    3px double var(--color-rule-dark);
--rule-double-ink:3px double var(--color-ink);
--rule-cartouche: 4px solid var(--color-ink);  /* the masthead outer border */
```

**Rule:** every section break should use one of these tokens. No `border-color: gray-200` ad-hoc.

### 2.7 Texture (paper grain)

Already in `globals.css` via `.paper-texture`. Keep it. Two additions:

- **Activate at:** every full-page surface (already done on `<body>` indirectly via the page wrapper). Do **not** apply texture inside cards or odds widgets — texture in small containers reads as dirt, not paper.
- **Day opacity:** 0.04 (current). **Night opacity:** raise from 0.06 → 0.05 to avoid grain banding under desk-lamp warmth.
- **No GIFs, no animated noise.** Static SVG only.

### 2.8 Motion tokens

```css
--motion-fast:   120ms;     /* tap, focus ring */
--motion-base:   200ms;     /* hover, simple state */
--motion-slow:   320ms;     /* enter/exit, body set */
--motion-press:  90ms;      /* active state — newspaper "stamp" feel */

--ease-ink:      cubic-bezier(0.2, 0.7, 0.2, 1);     /* default, "settle" */
--ease-stamp:    cubic-bezier(0.4, 0.0, 0.2, 1);     /* press, hard arrival */
--ease-set:      cubic-bezier(0.16, 1, 0.3, 1);      /* type-setting reveal */
```

**Allowed properties only:** `transform`, `opacity`, `filter` (for halftone/grain). Animating `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow` is **forbidden**. If you need a layout animation, it's wrong — pick a different interaction.

`prefers-reduced-motion` is respected globally (already wired). All keyframe animations must opt-out gracefully.

---

## 3. Component-level specs

Three highest-leverage components. Each ships in a single PR.

### 3.1 Homepage Masthead + Breaking Ticker

**The first 100ms impression.** Has to *announce* — this is a newspaper, not an app.

**Layout intent.** The current triple-border cartouche is correct and stays. Tighten it:

- Outer cartouche: `border-cartouche` (4px ink) → 3px gold gap → 1px ink inner. The current implementation has the right structure; replace the gold strip at the very top with a `--color-accent-gold` rule that sits *inside* the cartouche, not above it as a separate gradient bar. Gradient bars are SaaS, not broadsheet.
- Date / strapline / volume row: small caps, `--type-micro`, `--color-ink-light`.
- Wordmark: `--type-masthead`, weight 900, `letter-spacing: -0.01em` desktop, `0` mobile. **Drop the textShadow** — fake debossing reads as Etsy. Use a real 1px halftone overlay (paper bleed), or nothing.
- Volume / issue / price row: `--rule-thick` above, `--rule-hair` below. Tabular figures.
- Asset ticker strip: same as today, but use `--font-data` with `font-variant-numeric: tabular-nums`. Replace the API call to CoinGecko with a server-rendered prop or cached fetch — client-side fetch on the masthead is a CLS risk.

**Breaking Ticker.** Currently red bar + scrolling. Keep, but:

- Add a 2px gold rule **inside** the top of the bar (homage to old wire-service alerts).
- Replace the diamond bullet `◆ BREAKING ◆` with a small caps `EXTRA · EXTRA` block — more period-correct, more screenshotty.
- Probabilities in the ticker get tabular figures, in `--color-accent-gold`, separated by `·`.
- On hover (desktop), the ticker pauses (already done) and the hovered headline gains a 1px ink underline that *fades in* (not slides) over `--motion-base`.
- On mobile, the ticker remains; the wordmark scales to `--type-masthead` mobile (56px). At <380px, the volume strip wraps below the date instead of inline.

**Type treatment.**
- Date: `--type-micro`, `--font-ui`, small caps.
- Strapline ("The Independent Intelligence of the Future"): `--type-meta`, `--font-sub` italic, hidden <768px (already done).
- Wordmark: `--font-display`, weight 900, `--type-masthead`.

**Ornament budget.** This component gets the most ornament on the entire site: triple border, gold inner rule, double rule above the ticker. Worth it — it's the brand. Every other component gets ¼ of this ornament density, max.

**Interaction states.**
- Wordmark link focus: 2px outline in `--color-accent-blue`, offset 4px, *outside* the cartouche (not inside, which would visually break the border).
- Edition toggle button: on press, the icon "stamps" — `transform: scale(0.94)` over `--motion-press` with `--ease-stamp`. Background flips to `--color-ink`, text to `--color-paper`.
- Tip-the-editor button: on copy success, the button locks for 3s with a small caps "ALIAS COPIED" — this is already done; keep.

**Mobile adaptation.**
- ≤640px: cartouche keeps triple border but inner padding drops from 20px → 8px. Wordmark scales to 56px. Asset ticker hidden behind a "MARKETS ▾" disclosure (don't hide them entirely — they're a screenshot moment).
- ≤380px: strapline removed. Volume/issue stacks vertically. Wordmark scales to 44px.

**Dark mode.** Cartouche borders use `--color-rule-heavy` (= ink token, which is cream at night). Gold inner rule uses `--color-accent-gold` directly. Paper texture grain at 0.05 opacity. Wordmark in `--color-ink` (cream) — never pure white.

**Screenshot test.** A user screenshots the top of the page on a 9:16 phone. They should see: triple-border cartouche, the wordmark, date + volume, the breaking ticker mid-scroll with one bright headline visible, and the section nav peeking. **It must read "newspaper" before it reads "app."** If it doesn't, the cartouche is too small or the wordmark is too quiet.

---

### 3.2 Article page hero

**The screenshot moment.** This is what gets shared on Twitter when someone agrees with the take.

**Layout intent.** Right now it's a flat stack: kicker → image → headline → dek → byline → share. Restructure:

```
┌─────────────────────────────────────────────────┐
│ [POLITICS]  ────────────────────  Vol. 3 · No. 7│  ← kicker row, rule below
├─────────────────────────────────────────────────┤
│                                                 │
│              HEADLINE IN DISPLAY                │  ← --type-display, max 12 words/line
│              SET TIGHT, RAGGED                  │
│                                                 │
│   ┊ italicized dek, --font-sub, indented 1ch    │  ← --type-dek, --color-ink-medium
│                                                 │
├─────────────────────────────────────────────────┤
│ By the Newsroom · Nov 12, 2026 · 5 min read     │  ← --type-meta
├─────────────────────────────────────────────────┤
│                                                 │
│     [hero image, halftone treatment]            │  ← image AFTER headline (broadsheet order)
│     Caption in italic --font-sub                │
│                                                 │
└─────────────────────────────────────────────────┘
                                  ┌─────────────┐
                                  │ THE ODDS    │
                                  │             │
                                  │   67%       │  ← floating odds widget
                                  │ Very Likely │     (sticky on desktop, inline on mobile)
                                  │             │
                                  └─────────────┘
```

**Key change:** the image comes *after* the headline, not before. This is broadsheet hierarchy — the type sells the story, the photo confirms it. It also makes the headline the screenshot focal point.

**Type treatment.**
- Kicker: `--type-kicker`, small caps, `--color-accent-red` for the category label, `--color-ink-light` for vol/issue.
- Headline: `--type-display` mobile (36px) → desktop (72px). `--font-display`, weight 900, `letter-spacing: -0.015em`. Allow ragged-right (no `text-wrap: pretty` for the hero — we want long-line drama; do use `text-wrap: balance` for cards).
- Dek: `--type-dek`, italic, `--font-sub`, `--color-ink-medium`. Indent 1ch on first line via `text-indent: 1ch` for a typeset feel.
- Byline: `--type-meta`, italic, `--color-ink-light`. Tabular dates.
- **Drop cap on body:** already implemented in `.article-body > p:first-of-type::first-letter`. Keep, but increase float padding to 12px and ensure it's `--font-display` weight 900 — already correct.

**Odds widget (the screenshot star).**

This is the most-screenshotted element on the article page. Treat it as a precious object.

- Container: `--rule-medium` border (2px ink), `--color-paper-cream` background, 16px padding. **No shadow.** Broadsheets don't shadow.
- Top: small caps "THE ODDS" kicker.
- Number: `--font-data` (JetBrains Mono), tabular lining figures, weight 700, font-size **48px mobile / 64px desktop**. Color by probability bucket (existing `probColor` is correct). The number is the hero — it dominates the widget.
- Label below number: `probLabel` output ("Very Likely"), `--type-kicker`, small caps.
- Source line: hairline rule above, `--type-meta`, `--color-ink-light`.
- Volume: same line as source, separated by `·`.
- AccuracyBadge below.
- "Trade on Polymarket →" — small caps button, `--font-ui`, `--color-accent-blue`, on hover an underline *inks in* (left-to-right, 200ms).

**Ornament budget.** Single rule above the kicker row. Single double-rule below the byline. Hairline below the share bar. That's it. The ornament here is the *type itself* — display headline doing the heavy lifting.

**Interaction states.**
- Headline: not a link; selectable text. Cursor stays default. Long-press on mobile triggers native share sheet via Web Share API (we already have ShareBar — make sure it's reachable above the fold on mobile).
- Image: on hover desktop, halftone dot density bumps from 4px → 3px over `--motion-slow` — subtle "ink getting heavier." On mobile, no hover.
- Odds number: when the live probability changes (websocket / poll), the new digit *stamps* — see Motion section.
- Share bar buttons: small caps, ink-on-paper. On press, `scale(0.96)` for 90ms with `--ease-stamp`.

**Mobile adaptation.**
- ≤640px: odds widget moves from sticky-right-rail to **inline, directly below dek, before image**. This is the share-screenshot zone. Number scales to 56px. Widget becomes full-width with horizontal `--rule-medium` top + bottom (no left/right border) for a "section" feel rather than a card.
- ≤380px: dek font drops to 16px. Drop cap stays but reduces float-padding to 8px. Byline wraps.

**Dark mode.** Hero image gets `filter: brightness(0.92) contrast(1.05)` to feel lamp-lit. Halftone overlay uses screen blend (already done). Odds widget background flips to `--color-paper-cream` (warm graphite at night) — no special treatment, the tokens handle it.

**Screenshot test.** User on iPhone 14 takes a screenshot mid-scroll, getting kicker + headline + dek + byline + odds widget + first paragraph with drop cap. They should see: the stark display headline, an italic dek that reads like a real subhead (not marketing), a 67% in mono that looks *cited*, and a drop cap that says "this is a real article." If the headline doesn't fit in two lines on a 9:16 screenshot, the type-scale is wrong.

---

### 3.3 Daily Challenge card

**The habit-loop centerpiece.** Wordle DNA in a broadsheet wrapper.

**Layout intent.** Currently a centered card with double-rule masthead, market step, slider, and a Wordle-style emoji-block reveal. The bones are right. Sharpen:

- The container loses `boxShadow: "2px 2px 0 var(--color-rule)"` and gains a hard `--rule-medium` (2px ink) all-around with a 1px gold inner rule (homage to the masthead cartouche, in miniature). This unifies the brand language.
- Header reads: small-caps "THE FUTURE EXPRESS" kicker (`--type-kicker`), then "Daily Prediction Challenge" in `--type-h1` `--font-display`, then date in italic `--font-sub`, then a 1-unit gold rule (16px wide, 2px tall) — *not* the existing red bar. Gold = our "earned ornament" color.
- Step counter and category chip on a single row, both `--type-kicker`, small caps. Category chip border in `--color-rule`, no fill.
- Progress bar: keep the 1px hairline, but the filled portion uses `--color-accent-red` (not ink) — gives it a "stop the presses" urgency.
- Question: `--type-h2`, `--font-display`, weight 900. Max 2 lines on mobile (truncate with ellipsis if longer; better — write shorter questions).
- Current odds chip: italic `--font-sub` body with the number in `--font-data` tabular. Currently right; keep.
- Slider: keep the linear-gradient track. Improve thumb — add a `::-webkit-slider-thumb` styled as an ink dot (10px circle in `--color-ink`, no border-radius below 50%, no box-shadow, just a hard ink puck).
- Slider value display: `--type-display` mobile (36px) on a paper-cream pill with hairline border. When user drags, the number "leans" — add `transform: translateY(-1px)` during `:active` on the input via `[data-dragging="true"]` (set by JS on input/change handlers).
- "Lock In Prediction" button: `--type-kicker` (small caps), `--rule-medium` border (2px ink), no fill. On press, fills with ink and the text becomes `--color-paper`. Already done — confirm with new tokens.

**Score reveal (the share moment).**

- After lock-in: replace the existing centered colored box with a **broadsheet "EXTRA" stamp**. Container: `--rule-double-ink` (3px double ink) top and bottom, no left/right rule. Inside: small caps "RESULT" kicker, then score in `--font-display` weight 900 (e.g., "87 / 100"), then accuracy label in small caps in `scoreColor`.
- One line below: italic `--font-sub` "You said 60% · Market settled at 67%" — keep current, already correct.
- Animation on reveal: the score number "stamps in" — see Motion section.

**Final summary (the share grid).**

- Score block grid: keep emoji blocks, but render them as **CSS squares** in our actual color tokens, not Unicode emoji. Reason: emoji rendering varies wildly across platforms and screws up screenshots. Use 24×24px hard-edged boxes with 4px gaps, color-coded:
  - Green block: `--color-spot-green`
  - Amber block: `#b45309` (matches existing scoreColor)
  - Orange block: `--color-accent-red`
  - Red block: `--color-spot-red`
- The shareText copied to clipboard *keeps* emoji (for Twitter/Discord rendering) — but the on-screen blocks are CSS squares.
- Total score: `--type-masthead` mobile scale (56px), tabular figures, weight 900.
- Per-market breakdown: a tiny editorial "box score" table — left-aligned market name in italic `--font-sub`, right-aligned actual % and score in `--font-data` tabular. Hairline rules between rows.
- "Share Results" button: same broadsheet button as Lock In.
- Footer note: italic `--font-sub`, `--type-meta`, "Come back tomorrow for a new edition." Replace "challenge" with "edition" — it's on-brand.

**Ornament budget.** Container border + 1px gold inner rule + the gold accent dash. That's it. No drop shadow. No emoji. No gradients. The score block grid is the only color in the component — earned because it's the share payload.

**Interaction states.**
- Slider thumb on focus: ring in `--color-accent-blue` at 2px offset 2px.
- Lock In button on hover: ink fills bottom-up over 200ms with `--ease-set` (a "page printing" feel).
- Lock In button on press: scale(0.97) for 90ms.
- Score reveal entrance: "stamp" — see Motion section.

**Mobile adaptation.**
- ≤640px: card padding drops to 16px. Slider value display stays at 48px (don't downsize — it's the focal point). Buttons stay full-width.
- ≤380px: question text drops to 18px. Score reveal scales to 44px.

**Dark mode.** Inner gold rule stays gold (it's the brand spot). Slider track filled in `--color-ink` (cream at night). Score colors retain their hue but read against paper-cream — already handled by tokens.

**Screenshot test.** User finishes the challenge, gets 87/100, screenshots the final summary, and posts it. The screenshot must show: "DAILY PREDICTION CHALLENGE" masthead-style header, a huge 87/100, the colored block grid, and the per-market box score. It should read more like a *box score from a 1920s sports page* than a Duolingo result. If a stranger seeing it on Twitter doesn't immediately understand "newspaper × prediction Wordle," go again.

---

## 4. Motion language

A short, opinionated vocabulary. All durations and easings reference the motion tokens in §2.8. CSS implementation hints inline.

### 4.1 "The body sets in"
Article body paragraphs reveal column-by-column over 240ms, left to right, on initial paint. Imitates type being set on a press. Opt-out via `prefers-reduced-motion`.

```css
.article-body > p {
  opacity: 0;
  transform: translateY(4px);
  animation: type-set var(--motion-slow) var(--ease-set) forwards;
  animation-delay: calc(var(--p-index, 0) * 40ms);
}
@keyframes type-set {
  to { opacity: 1; transform: translateY(0); }
}
```
Set `--p-index` via inline style on each `<p>` during render. Cap at index 8 to avoid too-long stagger.

### 4.2 "Headlines ink, they don't underline"
Hover on a headline link: a 1px ink rule fades in *under* the baseline over 200ms. Not a CSS underline — a `::after` pseudo-rule at `bottom: -2px`, height 1px, `background: currentColor`, `opacity: 0 → 1`, `transform: scaleX(0) → 1` from `transform-origin: left`.

```css
.headline-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -2px;
  height: 1px; background: currentColor;
  transform: scaleX(0); transform-origin: left;
  transition: transform var(--motion-base) var(--ease-ink);
}
.headline-link:hover::after { transform: scaleX(1); }
```

### 4.3 "Numbers don't tween, they stamp"
Odds widget on probability change: the *new* digit fades in with a 90ms scale from 1.06 → 1.0, while the *old* digit fades out simultaneously. No counting animation — that's a SaaS tic. This is a stamped revision.

```css
@keyframes ink-stamp {
  0%   { opacity: 0; transform: scale(1.06); }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: scale(1.0); }
}
.odds-number[data-changed="true"] { animation: ink-stamp var(--motion-press) var(--ease-stamp); }
```
Toggle `data-changed` via React effect on probability change. `key={probability}` on the span also works to force remount.

### 4.4 "Buttons press, not bounce"
All button `:active` states: `transform: scale(0.97)` for 90ms with `--ease-stamp`. No spring, no rebound. It's a stamp, not a trampoline.

### 4.5 "Cards lift with a rule, not a shadow"
Card hover (desktop only): the bottom border thickens from 1px → 2px and the color darkens from `--color-rule` → `--color-rule-dark`. No `box-shadow` movement. The current `globals.css` `.card-hover` adds a faint shadow — *remove the shadow*, replace with this rule-thickening pattern.

```css
.card-hover { transition: border-color var(--motion-base) var(--ease-ink); }
@media (hover: hover) {
  .card-hover:hover { border-bottom-color: var(--color-rule-dark); border-bottom-width: 2px; }
}
```

### 4.6 "The ticker pauses on touch, not on hover"
Mobile already has no hover. Add `:focus-within` and a JS pause on `touchstart` for tap accessibility. Already partially handled — verify.

### 4.7 "Page transitions don't slide; they refresh"
Don't add page transitions. Newspapers don't fade between pages — you turn one. Native browser navigation is the right metaphor. If we ever want cross-page motion, do *one* thing only: a 1px ink rule that draws across the top of the viewport during route change (Next.js `loading.tsx` with a `<div className="route-rule" />` that animates `transform: scaleX(0 → 1)` over 320ms).

---

## 5. Implementation plan

15-line ordered list. Each step is independently shippable.

1. **Token rewrite in `globals.css`** — paper warmth, ink tints, rule tokens, type tokens, motion tokens, font-feature-settings (3h)
2. **Drop cap, halftone, paper-texture verification** under new tokens (1h)
3. **Masthead re-skin** — gold inner rule, remove textShadow, server-fetch prices, mobile cartouche tightening (4h)
4. **Breaking Ticker re-skin** — EXTRA · EXTRA, gold inner rule, hover ink underline (1h)
5. **SectionNav** — small caps, focus ring, mobile-first wrap (1h)
6. **ArticleCard** — replace box-shadow hover with rule-thickening, headline ink-underline, tabular figures on odds (3h)
7. **Article hero re-order** (image-after-headline, kicker row with vol/issue, drop cap padding) (3h)
8. **Odds widget polish** — typography, ink-stamp on probability change, mobile-inline placement (3h)
9. **Daily Challenge card** — gold inner rule, CSS-square block grid, broadsheet score reveal stamp (4h)
10. **Dark mode pass** — verify warmth, halftone screen-blend, no pure-white ink, inspect every component (3h)
11. **Motion polish** — type-set keyframe on article body, ink-underline on all headlines, ink-stamp on odds, button press feel (4h)
12. **Reduced-motion audit** — verify every animation opts out (1h)
13. **Mobile QA at 640/414/380px** for all three highlight components (2h)
14. **Screenshot pass** — actually screenshot every key surface, post to a Slack channel, score against §7 rubric (1h)
15. **Cleanup** — kill any remaining `box-shadow`, `gradient`, `rounded-xl` in product code (1h)

**Total: ~35 hours.** Fits in one engineer-week.

---

## 6. Anti-patterns (the kill list)

Things NOT to do. If you catch yourself doing one, the design is drifting.

1. **Don't import a Google Sans for "modern UI."** The existing DM Sans is the only sans we need, and it's reserved for kickers, meta, and UI chrome — not headlines, not body.
2. **Don't use Material elevation shadows.** Broadsheets don't have shadows; they have rules. `box-shadow` is banned outside of skeleton shimmer fallbacks. The current `card-hover` shadow goes away.
3. **Don't animate layout properties.** No animating `width`, `height`, `top`, `left`, `margin`, `padding`, `gap`. Transform/opacity/filter only.
4. **Don't dark-mode-by-inversion.** Dark is a designed theme. Test every dark surface against "newspaper under a desk lamp." If it feels OLED-cold, it's wrong.
5. **Don't add gradient buttons.** No `bg-gradient-to-*`. The accent palette is the entire color system. The single existing gold gradient bar in `playcard.tsx` is the *only* exception, and it's contained to social images.
6. **Don't use `rounded-xl` or above.** Newspapers have hard corners. Cards: `rounded-sm` (2px) or no radius at all. Buttons: no radius.
7. **Don't use `text-gray-*` Tailwind utilities directly.** All color must reference a token. If you need a new gray, add it to the token system first.
8. **Don't use Unicode emoji for UI primitives** (block grid, status chips, ornaments). Emoji renders inconsistently across platforms and ruins screenshots. Render with CSS or SVG. Emoji is allowed *only* in copy users can paste (the share-text clipboard payload, the breaking ticker prefix is OK).
9. **Don't use spring/bouncy easings.** No `cubic-bezier(0.34, 1.56, 0.64, 1)` (Framer's "anticipate"). Newspapers don't bounce. Use `--ease-ink`, `--ease-stamp`, `--ease-set` only.
10. **Don't fetch on the client for chrome.** The masthead's CoinGecko call is currently client-side and causes layout flicker. Move to a server component or cached route handler.
11. **Don't write `font-family` inline.** Use the token CSS variables. There are existing inline `style={{ fontFamily: ... }}` usages — leave those, but don't add more.
12. **Don't use `text-wrap: pretty` on hero headlines.** We want ragged-right drama. `balance` is fine for cards.

---

## 7. Screenshot scoring rubric

Self-test for any new screen. Score 0–10. Below 7, redesign.

- **+2** Screenshot at any aspect ratio (9:16, 1:1, 4:5) reads "newspaper" within 0.5 seconds.
- **+2** A non-user friend can tell what the *content* is (article topic / challenge result) without context.
- **+2** Type hierarchy is unambiguous — one element clearly dominates, not a tie.
- **+2** No SaaS-tells visible (no gradient buttons, no soft shadows, no rounded-xl, no emoji-as-UI).
- **+2** There's at least one piece of "earned ornament" (rule, kicker, drop cap, gold dash) — without it the screen reads as generic minimalism.

**Pass: 8+. Ship: 9+. Brand-defining: 10.**
