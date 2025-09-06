import { TrialRecord } from "../types";
import { normalizePhase, normalizeStatus } from "../normalize";

export async function fetchNCI(params: { condition: string; country?: string; status?: string; phase?: string; pageSize?: number; }): Promise<TrialRecord[]> {
  const url = new URL("https://clinicaltrialsapi.cancer.gov/v1/clinical-trials");
  if (params.condition) url.searchParams.set("keyword", params.condition);
  if (params.country) url.searchParams.set("sites.org_country", params.country);
  if (params.status) url.searchParams.set("current_trial_status", params.status);
  if (params.phase) url.searchParams.set("phase", params.phase);
  url.searchParams.set("size", String(params.pageSize ?? 10));
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  const trials = j.trials || [];
  return trials.map((t: any): TrialRecord => ({
    ids: { nct: t.clinical_trials_gov_id, other: t.nci_id },
    title: t.brief_title,
    condition: (t.diseases || []).map((d: any) => d.display_name),
    phase: normalizePhase(t.phase?.phase),
    status: normalizeStatus(t.current_trial_status),
    interventions: (t.arms || []).flatMap((a: any) => (a.interventions || []).map((i: any) => i.name)),
    primaryOutcome: t.primary_purpose?.description,
    locations: (t.sites || []).map((s: any) => ({ city: s.org_city, country: s.org_country, site: s.org_name })),
    startDate: t.start_date,
    lastUpdated: t.last_update_posted_date || t.updated_at,
    sources: [{ name: "NCI", url: `https://www.cancer.gov/about-cancer/treatment/clinical-trials/search/v?id=${t.nci_id}` }]
  }));
}
