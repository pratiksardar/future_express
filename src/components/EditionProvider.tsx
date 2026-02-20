"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Edition = "morning" | "night";

const EditionContext = createContext<{
  edition: Edition;
  setEdition: (e: Edition) => void;
}>({ edition: "morning", setEdition: () => {} });

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEditionState] = useState<Edition>("morning");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem("future-express-edition") as Edition | null;
    if (stored === "night" || stored === "morning") setEditionState(stored);
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      setEditionState("night");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-edition", edition);
    localStorage.setItem("future-express-edition", edition);
  }, [edition, mounted]);

  const setEdition = (e: Edition) => {
    setEditionState(e);
  };

  return (
    <EditionContext.Provider value={{ edition, setEdition }}>
      {children}
    </EditionContext.Provider>
  );
}

export function useEdition() {
  return useContext(EditionContext);
}
