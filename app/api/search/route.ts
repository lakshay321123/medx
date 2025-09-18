import { NextResponse } from 'next/server';

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  source: string;
};

export async function POST(req: Request) {
  const { query } = await req.json().catch(() => ({ query: '' }));
  if (!query || !String(query).trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const term = String(query).trim();

  // Build absolute URLs without relying on nextUrl (works in node & edge)
  const origin = new URL(req.url).origin;

  // --- WEB SEARCH (Google via local wrapper) ---
  const webResults = await (async () => {
    try {
      const endpoint = (process.env.SEARCH_API_URL || '/api/websearch').trim();
      const url = new URL(endpoint, origin);
      url.searchParams.set('q', term);

      const r = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
      if (!r.ok) return [] as SearchResult[];
      const data = await r.json().catch(() => ({}));
      const hits = Array.isArray((data as any).results) ? (data as any).results : [];
      return hits
        .map((x: any) => ({
          title: x.title || x.name || '',
          snippet: x.snippet || x.description || '',
          url: x.url || x.link || '',
          source: 'web'
        }))
        .filter((item: SearchResult) => item.title && item.url);
    } catch {
      return [] as SearchResult[];
    }
  })();

  // --- YOUR EXISTING OTHER SOURCES ---
  const [pubmed, openfda, trials] = await Promise.all([
    pubmedSearch(term),
    openFdaSearch(term),
    clinicalTrialsSearch(term)
  ]);

  // Combine and return in whatever shape your UI expects
  const results: SearchResult[] = [
    ...webResults,
    ...(Array.isArray(pubmed) ? pubmed : []),
    ...(Array.isArray(openfda) ? openfda : []),
    ...(Array.isArray(trials) ? trials : [])
  ];
  return NextResponse.json({ results });
}

async function pubmedSearch(q: string): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=5&term=${encodeURIComponent(q)}`;
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const j = await res.json();
    const ids: string[] = j.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const sumRes = await fetch(summaryUrl);
    if (!sumRes.ok) return [];
    const s = await sumRes.json();
    const out: SearchResult[] = [];
    for (const id of ids) {
      const item = s.result?.[id];
      if (item) {
        out.push({
          title: item.title,
          snippet: item.source || item.pubdate || '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          source: 'pubmed'
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function openFdaSearch(q: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results || []).map((r: any) => ({
      title: r.openfda?.brand_name?.[0] || r.id,
      snippet: (r.indications_and_usage?.[0] || '').slice(0, 200),
      url: `https://api.fda.gov/drug/label/${r.id}.json`,
      source: 'openfda'
    }));
  } catch {
    return [];
  }
}

async function clinicalTrialsSearch(q: string): Promise<SearchResult[]> {
  try {
    const url = `https://clinicaltrials.gov/api/query/study_fields?expr=${encodeURIComponent(q)}&fields=NCTId,BriefTitle,Condition&min_rnk=1&max_rnk=5&fmt=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    const studies = j.StudyFieldsResponse?.StudyFields || [];
    return studies.map((s: any) => ({
      title: s.BriefTitle?.[0] || '',
      snippet: (s.Condition || []).join(', '),
      url: `https://clinicaltrials.gov/study/${s.NCTId?.[0]}`,
      source: 'clinicaltrials'
    }));
  } catch {
    return [];
  }
}
