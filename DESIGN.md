# Design System — The Future Express

## Product Context
- **What this is:** A retro-broadsheet AI newspaper that turns prediction market data from Polymarket and Kalshi into researched articles and daily challenges.
- **Who it's for:** Prediction market enthusiasts, news readers who want probabilistic context, curious people who want to know "what are the odds."
- **Space/industry:** AI-generated media × prediction markets. Peers: Polymarket, Kalshi, Manifold (for markets), The Atlantic, NYT (for editorial design ambition).
- **Project type:** Editorial web app — equal parts newspaper and game.

---

## Aesthetic Direction
- **Direction:** Retro-Futuristic / Editorial — 1920s broadsheet printed by a machine that lives in 2026.
- **Decoration level:** Intentional — ornament earns its place. Rules, kickers, drop caps, and the masthead cartouche are the vocabulary. Everything else is restraint.
- **Mood:** Dignified, dry-witted, intellectually confident. Never cute. Never minimalist-Linear-sans-everything. Never gradient. The retro is the moat — every screen should look like something a stranger would screenshot.
- **Governing principle:** Ornament where it earns its place; restraint where it doesn't. When in doubt, remove the chrome and trust the rule.

**What stays 1920s:** column rules, double-rule dividers, all-caps masthead with triple-bordered cartouche, classifieds-style typography, drop caps, oldstyle figures in body copy, italic deks, halftone images, the dignified silence of paper. Grid is real — columns, rules, hierarchy by size and weight, not by color.

**What goes 2026:** variable-font headlines that breathe at different viewports, motion that imitates print (ink settling, type setting, numbers stamping), dark mode that reads like newsprint under a desk lamp, tap targets that respect thumbs, `prefers-reduced-motion` support.

---

## Typography

- **Display/Hero:** Playfair Display — `--font-display`. Weight 700/900. Loaded via `next/font/google`. Feature settings: `"kern", "liga", "lnum", "ss01"` (lining figs in display). Used for masthead, article headlines, challenge headers.
- **Body:** Lora — `--font-body`. Weight 400/700. Feature settings: `"kern", "liga", "onum"` (oldstyle figs in body copy). Used for article body and deks.
- **Sub/Italic:** Newsreader — `--font-sub`. Weight 400/600/700. Italic italic for deks, captions, attributions.
- **UI/Labels:** DM Sans — `--font-ui`. Weight 500/600/700. Reserved for kickers, meta text, buttons, nav, and UI chrome. Not headlines, not body.
- **Data/Tables:** JetBrains Mono — `--font-data`. Weight 700/800. Tabular feature settings: `"tnum", "lnum", "zero"`. Used for odds numbers, timestamps, data values. Always tabular — never proportional in number context.
- **Loading:** All via `next/font/google` in `src/app/layout.tsx` with CSS variable injection.
- **Small caps:** `--feat-smcp: "kern", "smcp", "c2sc"` — used for kickers, section labels, button text.

### Type Scale (mobile / desktop)

| Token | Mobile | Desktop |
|-------|--------|---------|
| `--type-masthead-size` | 56px / lh 1.0 | 112px / lh 0.95 |
| `--type-display-size` | 36px / lh 1.05 | 72px / lh 1.05 |
| `--type-h1-size` | 28px / lh 1.1 | 44px |
| `--type-h2-size` | 22px / lh 1.2 | 30px |
| `--type-h3-size` | 18px / lh 1.3 | 22px |
| `--type-dek-size` | 17px / lh 1.4 | 21px |
| `--type-body-size` | 17px / lh 1.62 | 18px / lh 1.65 |
| `--type-meta-size` | 13px / track 0.06em | — |
| `--type-kicker-size` | 11px / track 0.18em | track 0.20em |
| `--type-micro-size` | 10px / track 0.20em | — |

Body text never below 17px on mobile.

---

## Color

- **Approach:** Restrained — 1-2 accents + warm neutrals. Color is rare and cited, as if printed in a second press pass.

### Light Mode (`:root`)

| Token | Value | Role |
|-------|-------|------|
| `--color-paper` | `#f3ede0` | Primary surface — warm matte newsprint |
| `--color-paper-warm` | `#ebe3d2` | Sunken cards, market briefs |
| `--color-paper-cream` | `#faf6ec` | Raised cards, callouts |
| `--color-ink` | `#1a1714` | Primary type — warm black, never pure #000 |
| `--color-ink-medium` | `#3a352d` | Body, secondary text |
| `--color-ink-light` | `#6b6356` | Meta, captions |
| `--color-ink-faded` | `#968d7d` | Timestamps, micro |
| `--color-rule` | `#c4b9a8` | Hairline rules |
| `--color-rule-dark` | `#8b7e6e` | Medium rules |
| `--color-rule-heavy` | `#1a1714` | Thick rules (= ink) |
| `--color-accent-red` | `#8b2500` | Breaking news, kicker, error |
| `--color-accent-blue` | `#1b3a5c` | Link hover, odds chrome |
| `--color-accent-gold` | `#b8860b` | Spot ornament — masthead rule, awards. The "earned" color. |
| `--color-spot-green` | `#2d5f2d` | "Very likely" odds |
| `--color-spot-red` | `#8b0000` | "Unlikely" odds |

### Dark Mode (`[data-edition="night"]`)

Brief: *newspaper under a desk lamp.* Warm low-light, paper-like background, ink that's still ink (never pure white).

| Token | Value | Role |
|-------|-------|------|
| `--color-paper` | `#1f1c17` | Warm graphite, not OLED black |
| `--color-paper-warm` | `#2a2620` | Sunken |
| `--color-paper-cream` | `#332e26` | Raised |
| `--color-ink` | `#ece4d2` | Warm cream, never #fff |
| `--color-ink-medium` | `#c8bfa9` | Body |
| `--color-ink-light` | `#908875` | Meta |
| `--color-ink-faded` | `#5e5849` | Micro |
| `--color-rule` | `#4a4439` | Hairline |
| `--color-rule-dark` | `#6b6453` | Medium |
| `--color-rule-heavy` | `#ece4d2` | Thick |

Dark mode is a designed theme, not an inversion. Test every dark surface against "newspaper under a desk lamp." If it feels OLED-cold, it's wrong.

### Semantic States
| Token | Value |
|-------|-------|
| `--color-success` | `var(--color-spot-green)` |
| `--color-warning` | `#a06a0c` |
| `--color-error` | `var(--color-spot-red)` |

---

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable — generous for editorial, tight for data.
- **Scale:** `--space-1` through `--space-9` (4, 8, 12, 16, 24, 32, 48, 64, 80px)
- **Gutter:** `--space-gutter: 24px`
- **Max content width:** `--max-width: 1280px`
- **Article max width:** `--article-max-width: 680px`
- **Sidebar width:** `--sidebar-width: 300px`

---

## Layout

- **Approach:** Grid-disciplined for the app layer; creative-editorial for article hero and cards.
- **Border radius:** Sharp corners as default. `rounded-sm` (2px) max for cards. No radius on buttons. `rounded-xl` and above are banned — newspapers have hard corners.
- **Rules carry hierarchy.** Shadows are forbidden outside skeleton shimmer. Rules replace shadows: `--rule-hair` (1px hairline), `--rule-thin` (1px dark), `--rule-medium` (2px ink), `--rule-thick` (4px ink), `--rule-double` (3px double), `--rule-double-ink` (3px double ink), `--rule-cartouche` (4px ink).
- **Column rule:** 1px, referenced via `--column-rule-width`.
- **Card hover:** Bottom border thickens from 1px → 2px, color darkens from `--color-rule` → `--color-rule-dark`. No `box-shadow` movement.

---

## Motion

- **Approach:** Intentional — motion imitates print. Ink settles; type sets; numbers stamp. No spring, no bounce, no layout animation.
- **Banned:** `cubic-bezier(0.34, 1.56, 0.64, 1)` ("anticipate"/bouncy). No animating `width`, `height`, `margin`, `padding`, `gap` — transform/opacity/filter only.

### Easing Tokens
| Token | Value | Use |
|-------|-------|-----|
| `--ease-ink` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Default settle |
| `--ease-stamp` | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Hard arrival |
| `--ease-set` | `cubic-bezier(0.16, 1, 0.3, 1)` | Type-setting reveal |

### Duration Tokens
| Token | Value | Use |
|-------|-------|-----|
| `--motion-press` | 90ms | Active state — "newspaper stamp" |
| `--motion-fast` | 120ms | Tap, focus ring |
| `--motion-base` | 200ms | Hover, simple state |
| `--motion-slow` | 320ms | Enter/exit, body set |

### Motion Vocabulary
1. **"The body sets in"** — Article paragraphs reveal 0→1 opacity + 4px translateY, staggered 40ms per paragraph, capped at index 8. Opt-out via `prefers-reduced-motion`.
2. **"Headlines ink, they don't underline"** — Hover: `::after` rule scales from `scaleX(0)` → `scaleX(1)` over 200ms from `transform-origin: left`. Not a CSS underline.
3. **"Numbers don't tween, they stamp"** — Odds update: new digit stamps in (scale 1.06→1.0 + opacity 0→1) over 90ms. No counting animation. Use `key={probability}` or `data-changed` toggle.
4. **"Buttons press, not bounce"** — All `:active` states: `scale(0.97)` for 90ms with `--ease-stamp`.
5. **"Cards lift with a rule, not a shadow"** — `border-bottom-width: 1px → 2px`, `border-bottom-color: --color-rule → --color-rule-dark`. No shadow.
6. **"Page transitions don't slide"** — No page transitions. If ever needed: a single 1px ink rule drawing across the viewport top over 320ms during route change.

---

## Anti-Patterns (the kill list)

Things that break the brand. If you're doing one of these, stop.

1. **No Google Sans / new sans-serif for "modern UI."** DM Sans is the only sans. It's for kickers, meta, and UI chrome.
2. **No `box-shadow`** outside skeleton shimmer. Use rules.
3. **No layout animation.** Transform/opacity/filter only.
4. **No dark-mode-by-inversion.** Dark is designed. Test every surface against "under a desk lamp."
5. **No gradient buttons.** No `bg-gradient-to-*`. The gold gradient bar in `playcard.tsx` is the only exception and is contained to social images.
6. **No `rounded-xl` or above.** Cards: `rounded-sm` (2px) or no radius. Buttons: no radius.
7. **No `text-gray-*` Tailwind utilities directly.** All color must reference a CSS token.
8. **No Unicode emoji for UI primitives** — block grids, status chips, ornaments. Use CSS or SVG. Emoji is allowed only in copy users can paste.
9. **No spring/bouncy easings.** Only `--ease-ink`, `--ease-stamp`, `--ease-set`.
10. **No client-side fetches for chrome.** Masthead data, prices — server component or cached route handler.
11. **No inline `font-family`.** Use CSS variable tokens.
12. **No `text-wrap: pretty` on hero headlines.** Use `balance` only for cards. Hero gets ragged-right drama.

---

## Screenshot Scoring Rubric

Self-test for any new screen. Score 0–10. Below 7, redesign. Ship at 9+. Brand-defining: 10.

- **+2** Screenshot at any aspect ratio (9:16, 1:1, 4:5) reads "newspaper" within 0.5 seconds.
- **+2** A non-user friend can tell what the *content* is without context.
- **+2** Type hierarchy is unambiguous — one element clearly dominates, not a tie.
- **+2** No SaaS-tells visible (no gradient buttons, no soft shadows, no rounded-xl, no emoji-as-UI).
- **+2** At least one piece of "earned ornament" (rule, kicker, drop cap, gold dash) — without it the screen reads as generic minimalism.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-26 | Initial DESIGN.md created | Codified from `globals.css` tokens and `docs/design-revamp.md` spec. No design changes — documentation pass only. |
| (prior) | Playfair Display + Lora + Newsreader + DM Sans + JetBrains Mono stack | Broadsheet hierarchy: high-contrast serif for display, warm readable serif for body, geometric sans for UI chrome only, mono for data. |
| (prior) | Warm paper palette — `#f3ede0` base | Newsprint warmth. Never pure white or OLED black in any mode. |
| (prior) | Rules over shadows | Broadsheet structure. Shadows are a Material Design convention that breaks the 1920s metaphor. |
| (prior) | Stamp motion vocabulary | Print metaphor: ink doesn't spring, it settles. Numbers stamp, they don't count. |
| (prior) | `data-edition="night"` for dark mode | Designed night theme, not a CSS inversion. Controls the warm-graphite palette. |
