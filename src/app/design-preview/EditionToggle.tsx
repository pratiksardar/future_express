"use client";

import { useEffect, useState } from "react";

type Props = {
  rootSelector: string; // CSS selector for the root element to toggle data-edition on
};

export default function EditionToggle({ rootSelector }: Props) {
  const [night, setNight] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return;
    if (night) root.setAttribute("data-edition", "night");
    else root.removeAttribute("data-edition");
  }, [night, rootSelector]);

  return (
    <button
      type="button"
      className="preview-toggle"
      onClick={() => setNight((v) => !v)}
      aria-label="Toggle dark mode"
    >
      {night ? "Day Edition" : "Night Edition"}
    </button>
  );
}
