"use client";

import { useEdition } from "@/components/EditionProvider";

type Props = {
  editionNumber?: number | null;
};

/** Formats the date as "MONDAY 27 APRIL 2026" */
function formatBroadsheetDate(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const year = d.getFullYear();
  return `${weekday} ${day} ${month} ${year}`;
}

/**
 * V4 edition header — the thin 1px top bar that lives above the masthead
 * cartouche. Shows EDITION NO. {N} on the left, a formatted broadsheet
 * date in the center, and a ☀ DAY / ☾ NIGHT toggle on the right.
 *
 * Uses EditionProvider via useEdition — the toggle sets data-edition="day|night"
 * on <html> through the provider's setEdition call.
 */
export function EditionHeader({ editionNumber }: Props) {
  const { edition, setEdition } = useEdition();
  const dateStr = formatBroadsheetDate(new Date());
  const editionLabel = editionNumber != null ? `EDITION NO. ${editionNumber}` : "EDITION NO. —";

  return (
    <div className="fe-v4-edition-header" role="banner" aria-label="Edition header">
      <span className="fe-v4-edition-header__left">{editionLabel}</span>
      <time className="fe-v4-edition-header__center" dateTime={new Date().toISOString().slice(0, 10)}>
        {dateStr}
      </time>
      <span className="fe-v4-edition-header__right">
        <button
          type="button"
          aria-pressed={edition === "morning"}
          aria-label="Switch to day edition"
          className={`fe-v4-edition-toggle${edition !== "night" ? " fe-v4-edition-toggle--active" : ""}`}
          onClick={() => setEdition("morning")}
        >
          &#9728; DAY
        </button>
        <span aria-hidden="true" className="fe-v4-edition-header__divider">/</span>
        <button
          type="button"
          aria-pressed={edition === "night"}
          aria-label="Switch to night edition"
          className={`fe-v4-edition-toggle${edition === "night" ? " fe-v4-edition-toggle--active" : ""}`}
          onClick={() => setEdition("night")}
        >
          &#9790; NIGHT
        </button>
      </span>
    </div>
  );
}
