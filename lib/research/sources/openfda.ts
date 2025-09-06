import { fetchJson } from "@/lib/research/net";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export async function searchOpenFda(drug: string): Promise<Citation[]> {
  const apiKey = process.env.OPENFDA_API_KEY;
  const url = `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:${encodeURIComponent(drug)}&limit=5${apiKey ? `&api_key=${apiKey}` : ""}`;
  const data = await fetchJson(url).catch(() => null);
  const results = data?.results || [];
  return results.map((r: any) => ({
    id: r.safetyreportid || "",
    title: `Adverse event report for ${drug}`,
    url: "",
    source: "openfda",
    date: r.receivedate || "",
    extra: { reaction: r.patient?.reaction?.[0]?.reactionmeddrapt }
  }));
}

