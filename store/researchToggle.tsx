"use client";

import { createContext, useContext, useState } from "react";

const Ctx = createContext<{ researchOn: boolean; setResearchOn: (v: boolean) => void } | null>(null);

export function ResearchToggleProvider({ children, defaultOn = false }: { children: React.ReactNode; defaultOn?: boolean }) {
  const [researchOn, setResearchOn] = useState<boolean>(defaultOn);
  return <Ctx.Provider value={{ researchOn, setResearchOn }}>{children}</Ctx.Provider>;
}

export function useResearchToggle() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResearchToggle must be used inside ResearchToggleProvider");
  return ctx;
}
