'use client';
import React, { createContext, useContext, useState } from "react";

export type ResearchFilters = {
  phase?: "1" | "2" | "3" | "4";
  status?: "recruiting" | "active" | "completed";
  countries?: string[]; // canonical country names: ["India"], ["United States"]
  genes?: string[];     // e.g. ["EGFR","ALK"]
};

export const defaultFilters: ResearchFilters = {}; // start empty on every query scope

const Ctx = createContext<{
  filters: ResearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<ResearchFilters>>;
  reset: () => void;
} | null>(null);

export function ResearchFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<ResearchFilters>(defaultFilters);
  const reset = () => setFilters(defaultFilters);
  return <Ctx.Provider value={{ filters, setFilters, reset }}>{children}</Ctx.Provider>;
}

export function useResearchFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useResearchFilters must be used within ResearchFiltersProvider");
  return ctx;
}

