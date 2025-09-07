'use client';
import React, { createContext, useContext, useState } from 'react';

export type ResearchFilters = {
  query?: string; // ✅ NEW: main search input (keywords/condition)
  phase?: '1'|'2'|'3'|'4';
  status?: 'recruiting'|'active'|'completed'|'any';
  countries?: string[];   // use plain names like "United States"
  genes?: string[];       // comma->array
  source?: string;
};

export const defaultFilters: ResearchFilters = { status: 'recruiting', countries: [], source: 'All' };

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
