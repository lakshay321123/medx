"use client";

import { createContext, useContext, useState } from "react";
import type { ResearchFilters } from "@/types/research-core";

export const defaultFilters: ResearchFilters = {};

const Ctx = createContext<{
  filters: ResearchFilters;
  setFilters: (f: ResearchFilters) => void;
  reset: () => void;
} | null>(null);

export function ResearchFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<ResearchFilters>(defaultFilters);
  const reset = () => setFilters(defaultFilters);
  return <Ctx.Provider value={{ filters, setFilters, reset }}>{children}</Ctx.Provider>;
}

export function useResearchFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResearchFilters must be used inside ResearchFiltersProvider");
  return ctx;
}
