import { fetchJson } from "@/lib/research/net";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

export async function searchEuropePmc(query: string): Promise<Citation[]> {
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&resulttype=lite&format=json&pageSize=25`;
  const data = await fetchJson(url).catch(() => null);
  const results = data?.resultList?.result || [];
  return results.map((r: any) => ({
    id: r.id || r.pmid || r.pmcid || "",
    title: r.title || "",
    url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
    source: "eupmc",
    date: r.firstPublicationDate || r.pubYear || "",
    extra: { journal: r.journalTitle }
  }));
}

