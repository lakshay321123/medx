// lib/urls.ts
export const toPubMed = (pmid: string) =>
  `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`;

export const toNCT = (nctId: string) =>
  `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}`;
