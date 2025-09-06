import { fetchJson } from "@/lib/research/net";
import { normalizePhase } from "./utils";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: {
    status?: string;
    recruiting?: boolean;
    /** Raw phase string as reported by the registry */
    phase?: string;
    /** Normalized evidence level derived from the phase */
    evidenceLevel?: string;
  };
};

export async function searchIctrp(query: string): Promise<Citation[]> {
  const url = `https://trialsearch.who.int/api/TrialSearch?query=${encodeURIComponent(query)}`;
  const data = await fetchJson(url).catch(() => null);
  const trials = (data?.results || data || []) as any[];
  return trials.map(t => {
    const phaseRaw = t.Phase || t.phase || "";
    const status = t.RecruitmentStatus || t.status || "";
    const evidenceLevel = normalizePhase(phaseRaw);
    return {
      id: t.TrialID || t.trialid || t.ID || "",
      title: t.ScientificTitle || t.PublicTitle || t.title || "",
      url: t.TrialID ? `https://trialsearch.who.int/Trial2.aspx?TrialID=${encodeURIComponent(t.TrialID)}` : "",
      source: "ictrp",
      date: t.DateRegistration || t.date || "",
      extra: {
        status,
        recruiting: /recruiting/i.test(status),
        phase: phaseRaw || undefined,
        evidenceLevel,
      },
    };
  });
}

