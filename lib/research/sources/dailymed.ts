import { fetchJson } from "@/lib/research/net";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export async function searchDailyMed(rxCui: string): Promise<Citation[]> {
  const url = `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?rx=${encodeURIComponent(rxCui)}&pagesize=5`;
  const data = await fetchJson(url).catch(() => null);
  const list = data?.data?.spls || data?.spls || [];
  return list.map((d: any) => ({
    id: d.setid || d.id || "",
    title: d.title || d.name || "",
    url: d.setid ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${d.setid}` : "",
    source: "dailymed",
    date: d.modified || d.date || "",
    extra: { rxCui, evidenceLevel: "Drug Label" }
  }));
}

