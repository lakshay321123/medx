const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
export async function searchNCBIBooks(q: string, retmax = 10) {
  const esearch = `${BASE}/esearch.fcgi?db=books&retmode=json&retmax=${retmax}&term=${encodeURIComponent(q)}`;
  const r = await fetch(esearch, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const ids: string[] = j?.esearchresult?.idlist || [];
  const esummary = `${BASE}/esummary.fcgi?db=books&retmode=json&id=${ids.join(",")}`;
  const r2 = await fetch(esummary, { cache: "no-store" });
  if (!r2.ok) return [];
  const j2 = await r2.json();
  const res = j2?.result || {};
  return ids.map(id => ({
    id,
    title: res[id]?.title,
    url: res[id]?.bookurl,
    source: "ncbi_books",
  }));
}
