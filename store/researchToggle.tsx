'use client';

import { createContext, useContext, useState } from 'react';

const Ctx = createContext<{ researchOn: boolean; setResearchOn: (v:boolean)=>void }>({ researchOn: false, setResearchOn: () => {} });

export function ResearchToggleProvider({ children, defaultOn=false }: { children: React.ReactNode; defaultOn?: boolean }) {
  const [researchOn, setResearchOn] = useState(defaultOn);
  return <Ctx.Provider value={{ researchOn, setResearchOn }}>{children}</Ctx.Provider>;
}

export function useResearchToggle() {
  return useContext(Ctx);
}

