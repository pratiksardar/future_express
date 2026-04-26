/**
 * Server-side text fitter for playcard rendering.
 *
 * Wraps @chenglou/pretext (a pure-JS text measurement library) so we can:
 *  - Ask "does this string fit in N lines at width W with this font?"
 *  - Pick the LARGEST font size from a candidate list that still fits
 *  - Truncate by grapheme at the exact break-point of the last allowed line
 *
 * Pretext's measurement layer needs `OffscreenCanvas` (or a DOM canvas).
 * In Node we polyfill via `@napi-rs/canvas`. The polyfill is installed
 * lazily on first use so importing this module doesn't pay the native-load
 * cost during cold edge/serverless boots that never render a card.
 *
 * Font alignment: next/og's Satori renderer falls back to its bundled
 * `noto-sans-v27-latin-regular.ttf` (REGULAR weight only) whenever the
 * requested CSS family is not supplied via the `fonts` option. Our playcards
 * declare `Georgia` but never supply a Georgia font file, so Satori draws
 * Noto Sans. When the JSX requests `fontWeight: 700`, Satori synthesizes
 * a faux-bold by stroking the regular outlines, which makes glyphs ~7-12%
 * wider than the regular metrics suggest.
 *
 * To match what Satori draws we:
 *  1) register the same Noto Sans .ttf into @napi-rs/canvas under
 *     `PRETEXT_MEASUREMENT_FAMILY` so pretext measures the right glyphs
 *  2) apply a weight-aware width safety multiplier — heavier weights get a
 *     tighter budget, modeling the synth-bold expansion
 *
 * Every public entry point is wrapped in try/catch and falls back to a
 * character-count truncation so a Pretext bug can never take down all
 * share cards.
 */

import path from "node:path";
import fs from "node:fs";
import * as napiCanvas from "@napi-rs/canvas";
import * as pretext from "@chenglou/pretext";

const ELLIPSIS = "…";

/**
 * Family name we register Satori's Noto Sans .ttf under in @napi-rs/canvas.
 * Pretext receives this in the CSS shorthand and skia uses the registered
 * file directly, giving glyph metrics that match Satori's layout pass.
 */
export const PRETEXT_MEASUREMENT_FAMILY = "PretextSatoriNoto";

/**
 * Width safety multiplier baseline (regular weight). Even with the same font,
 * pretext's skia metrics differ from Satori's harfbuzz layout by a percent or
 * two due to subpixel positioning + kerning pair coverage. 0.96 means we ask
 * "does it fit in 96% of the width?" — gives ~4% headroom.
 */
const BASE_WIDTH_SAFETY = 0.96;

/** Extra tightening for synth-bold rendering (Satori has no bold Noto Sans
 * shipped, so it strokes the regular face). Empirically the strokes add about
 * 6-9% to glyph advances; 0.91 gives consistent 2-line wraps. */
const BOLD_SYNTH_SAFETY = 0.91;

let initialized = false;
let initFailed = false;

type PretextApi = typeof import("@chenglou/pretext");

function ensureInitialized(): boolean {
  if (initFailed) return false;
  if (initialized) return true;

  try {
    // 1) Polyfill OffscreenCanvas via @napi-rs/canvas.
    const g = globalThis as unknown as { OffscreenCanvas?: unknown };
    if (typeof g.OffscreenCanvas === "undefined") {
      class OffscreenCanvasShim {
        private inner: { getContext: (kind: "2d") => unknown };
        constructor(w: number, h: number) {
          this.inner = napiCanvas.createCanvas(w, h) as unknown as {
            getContext: (kind: "2d") => unknown;
          };
        }
        getContext(kind: string): unknown {
          if (kind !== "2d") return null;
          return this.inner.getContext("2d");
        }
      }
      g.OffscreenCanvas = OffscreenCanvasShim;
    }

    // 2) Register Satori's bundled Noto Sans .ttf so pretext measures what
    //    Satori actually draws.
    const fontPath = path.join(
      process.cwd(),
      "node_modules",
      "next",
      "dist",
      "compiled",
      "@vercel",
      "og",
      "noto-sans-v27-latin-regular.ttf",
    );
    if (
      napiCanvas.GlobalFonts &&
      fs.existsSync(fontPath) &&
      !napiCanvas.GlobalFonts.has(PRETEXT_MEASUREMENT_FAMILY)
    ) {
      napiCanvas.GlobalFonts.registerFromPath(fontPath, PRETEXT_MEASUREMENT_FAMILY);
    }

    initialized = true;
    return true;
  } catch (err) {
    console.error("[textFit] init failed:", err);
    initFailed = true;
    return false;
  }
}

export type FitInput = {
  text: string;
  /** CSS shorthand, e.g. "700 88px PretextSatoriNoto" */
  font: string;
  /** Px font size — needed to convert pretext's unitless line-height into px */
  fontSize: number;
  /** Line-height multiplier (e.g. 1.12) */
  lineHeight: number;
  /** Hard maximum interior width in px */
  maxWidth: number;
  /** Hard cap on lines */
  maxLines: number;
  letterSpacing?: number;
  /**
   * Numeric font-weight for the rendered text. When 600+ the fitter assumes
   * Satori will synth-bold the bundled regular Noto Sans and tightens the
   * width budget accordingly.
   */
  weight?: number;
};

export type FitResult = {
  /** Possibly truncated, with trailing ellipsis if cut */
  text: string;
  lineCount: number;
  /** Pixel height (lineCount * fontSize * lineHeight) */
  height: number;
  /** False if the original text had to be truncated */
  fitsBudget: boolean;
};

/** Char-count fallback when Pretext is unavailable / throws. */
function fallbackTrunc(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= Math.floor(max * 0.55)) return `${cut}${ELLIPSIS}`;
  return `${cut.slice(0, lastSpace)}${ELLIPSIS}`;
}

/** Approximate average character width for a font size. Used only as a
 * last-resort fallback when Pretext is unavailable. */
function approxCharsPerLine(fontSize: number, maxWidth: number): number {
  // Noto Sans averages ~0.5em per glyph in body copy. Conservative.
  const avg = fontSize * 0.5;
  return Math.max(1, Math.floor(maxWidth / avg));
}

function safetyForWeight(weight: number | undefined): number {
  if (weight !== undefined && weight >= 600) return BOLD_SYNTH_SAFETY;
  return BASE_WIDTH_SAFETY;
}

function fitTextWithPretext(
  api: PretextApi,
  input: FitInput,
): FitResult {
  const { text, font, fontSize, lineHeight, maxWidth, maxLines, letterSpacing, weight } = input;
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: "", lineCount: 0, height: 0, fitsBudget: true };
  }

  const opts = letterSpacing !== undefined ? { letterSpacing } : undefined;
  const prepared = api.prepareWithSegments(trimmed, font, opts);
  const pxLineHeight = fontSize * lineHeight;
  const effectiveWidth = maxWidth * safetyForWeight(weight);

  const ranges: import("@chenglou/pretext").LayoutLineRange[] = [];
  api.walkLineRanges(prepared, effectiveWidth, (line) => {
    ranges.push(line);
  });

  if (ranges.length <= maxLines) {
    return {
      text: trimmed,
      lineCount: ranges.length,
      height: ranges.length * pxLineHeight,
      fitsBudget: true,
    };
  }

  // Need to truncate. Take exactly `maxLines` lines worth of text, then
  // ellipsis the tail.
  const lastAllowed = ranges[maxLines - 1];
  const materialized = api.materializeLineRange(prepared, lastAllowed);

  let acc = "";
  for (let i = 0; i < maxLines - 1; i++) {
    acc += api.materializeLineRange(prepared, ranges[i]).text;
  }
  let lastLineText = materialized.text;

  // Strip trailing whitespace + back up to last space so we don't end mid-word.
  lastLineText = lastLineText.replace(/\s+$/u, "");
  const lastSpace = lastLineText.lastIndexOf(" ");
  if (lastSpace > 0 && lastSpace > lastLineText.length * 0.4) {
    lastLineText = lastLineText.slice(0, lastSpace);
  }

  const finalText = `${acc}${lastLineText}${ELLIPSIS}`;

  return {
    text: finalText,
    lineCount: maxLines,
    height: maxLines * pxLineHeight,
    fitsBudget: false,
  };
}

export function fitText(input: FitInput): FitResult {
  const ready = ensureInitialized();
  if (!ready) {
    const charsPerLine = approxCharsPerLine(input.fontSize, input.maxWidth);
    const budget = charsPerLine * input.maxLines;
    const trimmed = input.text.trim();
    if (trimmed.length <= budget) {
      const est = Math.max(1, Math.ceil(trimmed.length / charsPerLine));
      return {
        text: trimmed,
        lineCount: Math.min(est, input.maxLines),
        height: Math.min(est, input.maxLines) * input.fontSize * input.lineHeight,
        fitsBudget: true,
      };
    }
    return {
      text: fallbackTrunc(trimmed, budget),
      lineCount: input.maxLines,
      height: input.maxLines * input.fontSize * input.lineHeight,
      fitsBudget: false,
    };
  }

  try {
    return fitTextWithPretext(pretext as PretextApi, input);
  } catch (err) {
    console.error("[textFit] fitText threw:", err);
    const charsPerLine = approxCharsPerLine(input.fontSize, input.maxWidth);
    const budget = charsPerLine * input.maxLines;
    return {
      text: fallbackTrunc(input.text.trim(), budget),
      lineCount: input.maxLines,
      height: input.maxLines * input.fontSize * input.lineHeight,
      fitsBudget: input.text.trim().length <= budget,
    };
  }
}

export type FitSizesInput = {
  text: string;
  /**
   * Family used for MEASUREMENT (skia in @napi-rs/canvas). For pixel-accurate
   * Satori alignment use PRETEXT_MEASUREMENT_FAMILY. The visual rendering in
   * the playcard remains controlled by the JSX's CSS fontFamily.
   */
  fontFamily: string;
  weight: string;
  /** Optional CSS font-style (italic / normal) */
  style?: string;
  /** Tried largest first */
  sizes: number[];
  lineHeight: number;
  maxWidth: number;
  maxLines: number;
  letterSpacing?: number;
};

export type FitWithSizeResult = FitResult & { fontSize: number };

function buildFontShorthand(
  family: string,
  weight: string,
  style: string | undefined,
  size: number,
): string {
  const parts: string[] = [];
  if (style && style !== "normal") parts.push(style);
  parts.push(weight);
  parts.push(`${size}px`);
  parts.push(family);
  return parts.join(" ");
}

/**
 * Try sizes from largest to smallest, return the first that fits without
 * truncation. If none fit, return the smallest with truncation applied.
 */
export function fitWithBestSize(input: FitSizesInput): FitWithSizeResult {
  if (input.sizes.length === 0) {
    throw new Error("fitWithBestSize: sizes must be non-empty");
  }

  const numericWeight = Number.parseInt(input.weight, 10);
  let lastResult: FitWithSizeResult | null = null;
  for (const size of input.sizes) {
    const font = buildFontShorthand(input.fontFamily, input.weight, input.style, size);
    const result = fitText({
      text: input.text,
      font,
      fontSize: size,
      lineHeight: input.lineHeight,
      maxWidth: input.maxWidth,
      maxLines: input.maxLines,
      letterSpacing: input.letterSpacing,
      weight: Number.isFinite(numericWeight) ? numericWeight : undefined,
    });
    if (result.fitsBudget) {
      return { ...result, fontSize: size };
    }
    lastResult = { ...result, fontSize: size };
  }
  return lastResult as FitWithSizeResult;
}
