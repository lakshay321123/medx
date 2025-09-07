'use client';

import { createContext, useContext, useState } from 'react';

const Ctx = createContext<{ mode: 'patient'|'doctor'; setMode: (m:'patient'|'doctor')=>void }>({ mode: 'patient', setMode: () => {} });

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'patient'|'doctor'>('patient');
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useAppMode() {
  return useContext(Ctx);
}

