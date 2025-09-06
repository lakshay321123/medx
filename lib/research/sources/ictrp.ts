import { fetchJson } from "@/lib/research/net";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export async function searchIctrp(query: string): Promise<Citation[]> {
  const url = `https://trialsearch.who.int/api/TrialSearch?query=${encodeURIComponent(query)}`;
  const data = await fetchJson(url).catch(() => null);
  const trials = (data?.results || data || []) as any[];
  return trials.map(t => ({
    id: t.TrialID || t.trialid || t.ID || "",
    title: t.ScientificTitle || t.PublicTitle || t.title || "",
    url: t.TrialID ? `https://trialsearch.who.int/Trial2.aspx?TrialID=${encodeURIComponent(t.TrialID)}` : "",
    source: "ictrp",
    date: t.DateRegistration || t.date || "",
    extra: { status: t.RecruitmentStatus || t.status }
  }));
}

