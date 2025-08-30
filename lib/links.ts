export function cleanUrl(u?: string): string | undefined {
  if (!u) return undefined;
  return u.replace(/\)$/, '').replace(/\]$/, '').trim();
}
export function pubmedUrl(pmidOrUrl: string) {
  if (/^https?:/i.test(pmidOrUrl)) return cleanUrl(pmidOrUrl)!;
  return `https://pubmed.ncbi.nlm.nih.gov/${pmidOrUrl.replace(/\D/g,'')}/`;
}
export function ctgovUrl(nctOrUrl: string) {
  if (/^https?:/i.test(nctOrUrl)) return cleanUrl(nctOrUrl)!;
  const nct = nctOrUrl.toUpperCase().match(/NCT\d{8}/)?.[0];
  return nct ? `https://clinicaltrials.gov/study/${nct}` : cleanUrl(nctOrUrl)!;
}
