"use client";

type Props = {
  prefix: string;
};

/**
 * Renders the prefix in monospace and a blinking cursor.
 * The cursor blink uses CSS keyframes (1s steps) on the .v4-cursor span.
 * Color split: prefix in --color-ink-medium, cursor in --color-spot-green.
 */
export default function WireDispatchCursor({ prefix }: Props) {
  return (
    <span className="v4-wire-line">
      <span className="v4-wire-prefix">{prefix}</span>
      <span className="v4-cursor" aria-hidden="true">
        ▍
      </span>
    </span>
  );
}
