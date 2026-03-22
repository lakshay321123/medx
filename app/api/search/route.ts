import { NextResponse } from 'next/server';
import { searchEuropePMC } from '@/lib/europepmc';

export async function POST(req: Request) {
  const { query } = await req.json().catch(() => ({ query: '' }));
  if (!query || !String(query).trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  // Fetch from Google CSE and EuropePMC in parallel
  const [webResults, pubmedResults] = await Promise.all([
    // Google CSE
    (async () => {
      try {
        const endpoint = (process.env.SEARCH_API_URL || '/api/websearch').trim();
        const url = new URL(endpoint, origin);
        url.searchParams.set('q', String(query));
        const r = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
        const data: any = r.ok ? await r.json().catch(() => ({})) : {};
        return Array.isArray(data.results)
          ? data.results.map((x: any) => ({ ...x, source: 'web' }))
          : [];
      } catch { return []; }
    })(),
    // EuropePMC (PubMed)
    (async () => {
      try {
        const papers = await searchEuropePMC(String(query), 3);
        return papers.map(p => ({
          title: p.title || 'Untitled',
          url: p.url || p.oa_url || (p.doi ? `https://doi.org/${p.doi}` : ''),
          snippet: p.abstract ? p.abstract.slice(0, 200) : '',
          source: 'pubmed',
        }));
      } catch { return []; }
    })(),
  ]);

  // Combine: web results first, then PubMed
  const results = [...webResults.slice(0, 5), ...pubmedResults];
  return NextResponse.json({ results });
}
