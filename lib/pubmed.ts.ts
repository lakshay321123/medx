const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
export async function searchPubmed(term: string) {
  const url = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=5&api_key=${process.env.NCBI_API_KEY||''}`;
  const res = await fetch(url, { next: { revalidate: 300 }});
  if (!res.ok) throw new Error("PubMed search error");
  return res.text();
}
