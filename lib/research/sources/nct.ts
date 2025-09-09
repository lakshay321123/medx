import type { TrialRecord } from "@/types/research";

export async function searchNCT(query: string): Promise<TrialRecord[]> {
  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.term=${encodeURIComponent(query)}&pageSize=25`;
  let data: any;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`NCT HTTP ${res.status}`);
    data = await res.json();
  } catch {
    return [];
  }
  return (data?.studies || [])
    .map((s: any): TrialRecord => {
      const id = s.protocolSection?.identificationModule?.nctId || "";
      const locations = (s.protocolSection?.contactsLocationsModule?.locations || []).map((loc: any) => {
        const city = loc.city;
        const country = loc.country;
        return [city, country].filter(Boolean).join(", ");
      });
      return {
        registry: "NCT",
        registry_id: String(id).trim(),
        title: String(s.protocolSection?.identificationModule?.briefTitle || "").trim(),
        condition: String(s.protocolSection?.conditionsModule?.conditions?.[0] || "").trim() || undefined,
        phase: String(s.protocolSection?.designModule?.phases?.[0] || "").trim() || undefined,
        status: String(s.protocolSection?.statusModule?.overallStatus || "").trim() || undefined,
        locations,
        url: id ? `https://clinicaltrials.gov/study/${encodeURIComponent(id)}` : "",
        when: {
          registered: s.protocolSection?.statusModule?.studyFirstPostDateStruct?.date,
          updated: s.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date,
        },
        snippet: String(s.protocolSection?.descriptionModule?.briefSummary || "").slice(0, 200),
      };
    })
    .filter((t: TrialRecord) => t.registry_id && t.title);
}
