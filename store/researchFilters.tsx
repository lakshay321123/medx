'use client';
import React, { createContext, useContext, useState } from 'react';

export type ResearchFilters = {
  phase?: '1'|'2'|'3'|'4';
  status?: 'recruiting'|'active'|'completed'|'any';
  countries?: string[];
  genes?: string[];
};

export const defaultFilters: ResearchFilters = { status: 'recruiting' };

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
