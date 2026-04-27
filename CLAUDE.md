# Future Express — Claude Instructions

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, border radii, motion, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

Key rules at a glance:
- Paper palette: `--color-paper` (#f3ede0), ink: `--color-ink` (#1a1714). Never pure white or pure black.
- Fonts: Playfair Display (display), Lora (body), Newsreader (italic/sub), DM Sans (UI only), JetBrains Mono (data).
- No `box-shadow` outside skeleton shimmer. Use CSS rule tokens instead.
- No `rounded-xl` or above. Hard corners are the brand.
- No gradient buttons. No bouncy easings. No layout animation.
- Motion vocabulary: ink settles, numbers stamp, buttons press. See DESIGN.md §Motion.
- Dark mode is `[data-edition="night"]` — a designed warm theme, not an inversion.
