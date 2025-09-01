import { NextRequest, NextResponse } from 'next/server';

export type SearchResult = {
  title: string;
  snippet: string;
  url: string;
  source: string;
};

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const [web, pubmed, openfda, trials] = await Promise.all([
      webSearch(query),
      pubmedSearch(query),
      openFdaSearch(query),
      clinicalTrialsSearch(query)
    ]);

    const results: SearchResult[] = [...web, ...pubmed, ...openfda, ...trials];
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

async function webSearch(q: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://ddg-api.herokuapp.com/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results || []).map((r: any) => ({
      title: r.title,
      snippet: r.description,
      url: r.url,
      source: 'web'
    }));
  } catch {
    return [];
  }
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
