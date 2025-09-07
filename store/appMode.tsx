"use client";

import { createContext, useContext, useState } from "react";

export type AppMode = "patient" | "doctor";

const Ctx = createContext<{ mode: AppMode; setMode: (m: AppMode) => void } | null>(null);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("patient");
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useAppMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppMode must be used inside AppModeProvider");
  return ctx;
}
