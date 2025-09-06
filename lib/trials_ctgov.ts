import type { Trial } from "@/types/research";

export async function searchCTGov(condition: string, opts: { country?: string; phase?: string[]; status?: string[]; size?: number } = {}): Promise<Trial[]> {
  const url = new URL("https://clinicaltrials.gov/api/v2/studies");
  url.searchParams.set("query.term", condition);
  url.searchParams.set("pageSize", String(Math.min(50, Math.max(1, opts.size ?? 10))));
  if (opts.country) url.searchParams.set("filter.location.country", opts.country);
  if (opts.phase && opts.phase.length) url.searchParams.set("filter.phase", opts.phase.join(","));
  if (opts.status && opts.status.length) url.searchParams.set("filter.overallStatus", opts.status.join(","));
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const studies = j?.studies || [];
  return studies.map((s: any): Trial => {
    const prot = s.protocolSection || {};
    const idMod = prot.identificationModule || {};
    const conds = prot.conditionsModule?.conditions || [];
    const intervs = prot.armsInterventionsModule?.interventions?.map((i: any) => i.name) || [];
    const contacts = prot.contactsLocationsModule?.locations?.[0] || {};
    return {
      id: idMod.nctId,
      title: idMod.briefTitle,
      conditions: conds,
      interventions: intervs,
      status: prot.statusModule?.overallStatus,
      phase: (prot.designModule?.phases || []).join(", "),
      start: prot.statusModule?.startDateStruct?.date,
      complete: prot.statusModule?.completionDateStruct?.date,
      type: prot.designModule?.studyType,
      sponsor: prot.sponsorCollaboratorsModule?.leadSponsor?.name,
      site: contacts.facility,
      city: contacts.city,
      country: contacts.country,
      eligibility: prot.eligibilityModule?.eligibilityCriteria,
      primaryOutcome: prot.outcomesModule?.primaryOutcomes?.[0]?.measure,
      url: `https://clinicaltrials.gov/study/${idMod.nctId}`,
      source: "ctgov",
    };
  });
}
