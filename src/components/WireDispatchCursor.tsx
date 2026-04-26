"use client";

type Props = {
  prefix: string;
};

/**
 * Wire-dispatch cursor: monospace text + a blinking terminal cursor.
 *
 * The cursor blink uses CSS keyframes (1s steps) on the .fe-v4-cursor
 * span. Color split: prefix in --color-rule-dark, cursor in
 * --color-accent-gold (amber — desk-lamp newspaper, not CRT phosphor).
 *
 * Ported from src/app/design-preview/v4/WireDispatchCursor.tsx.
 */
export default function WireDispatchCursor({ prefix }: Props) {
  return (
    <span className="fe-v4-wire-line">
      <span className="fe-v4-wire-prefix">{prefix}</span>
      <span className="fe-v4-cursor" aria-hidden="true">
        ▍
      </span>
    </span>
  );
}
