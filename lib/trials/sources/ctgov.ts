import { TrialRecord } from "../types";
import { searchCTGov } from "@/lib/trials_ctgov";

export async function fetchCTGov(params: { condition: string; country?: string; status?: string; phase?: string; pageSize?: number; }): Promise<TrialRecord[]> {
  const rows = await searchCTGov(params.condition, {
    country: params.country,
    phase: params.phase ? params.phase.split(",") : undefined,
    status: params.status ? params.status.split(",") : undefined,
    size: params.pageSize
  });
  return rows.map(r => ({
    ids: { nct: r.id },
    title: r.title,
    condition: r.conditions ?? [],
    phase: r.phase,
    status: r.status,
    interventions: r.interventions ?? [],
    primaryOutcome: r.primaryOutcome,
    locations: r.city || r.country || r.site ? [{ city: r.city, country: r.country, site: r.site }] : [],
    startDate: r.start,
    lastUpdated: undefined,
    sources: [{ name: "ClinicalTrials.gov", url: r.url }]
  }));
}
