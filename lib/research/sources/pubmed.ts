import { fetchJson } from "@/lib/research/net";

export type Citation = {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  extra?: any;
};

/**
 * Search PubMed for relevant articles.
 * Returns first 50 results with titles and links.
 */
export async function searchPubMed(query: string): Promise<Citation[]> {
  const esearch = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=50&retmode=json&term=${encodeURIComponent(query)}`
    + (process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "");
  const ids = await fetchJson(esearch).then(j => j?.esearchresult?.idlist || []).catch(() => []);
  if (!ids.length) return [];

  const esummary = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`
    + (process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : "");
  const sum = await fetchJson(esummary).catch(() => null);
  const recs = sum?.result || {};

  return ids.map((id: string) => {
    const r = recs[id];
    return r ? {
      id,
      title: (r.title || "").trim(),
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      source: "pubmed",
      date: (r.pubdate || r.epubdate || "").slice(0, 10),
      extra: { journal: r.fulljournalname }
    } : null;
  }).filter(Boolean) as Citation[];
}

