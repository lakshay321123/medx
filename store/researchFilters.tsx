"use client";

import { createContext, useContext, useState } from "react";
import type { ResearchFilters } from "@/types/research";

export const defaultFilters: ResearchFilters = {};

type CtxType = {
  filters: ResearchFilters;
  setFilters: (f: ResearchFilters) => void;
  reset: () => void;
};

const Ctx = createContext<CtxType | null>(null);

export function ResearchFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<ResearchFilters>(defaultFilters);
  const reset = () => setFilters(defaultFilters);
  return <Ctx.Provider value={{ filters, setFilters, reset }}>{children}</Ctx.Provider>;
}

export function useResearchFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResearchFilters must be used within ResearchFiltersProvider');
  return ctx;
}
