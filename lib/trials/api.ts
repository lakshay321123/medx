import type { TrialRow } from "@/types/trials";

export async function searchTrials(filters: {
  condition?: string;
  phase?: number | "any";
  status?: string | "any";
  country?: string[];
  genes?: string[];
}): Promise<TrialRow[]> {
  const params = new URLSearchParams();

  if (filters.condition) params.append("condition", filters.condition);
  if (filters.phase && filters.phase !== "any") params.append("phase", String(filters.phase));
  if (filters.status && filters.status !== "any") params.append("status", filters.status);
  if (filters.country?.length) params.append("country", filters.country.join(","));
  if (filters.genes?.length) params.append("genes", filters.genes.join(","));

  const res = await fetch(`/api/trials/search?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch trials");
  const data = await res.json();
  return data.trials || [];
}
