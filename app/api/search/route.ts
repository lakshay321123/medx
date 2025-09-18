import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { query } = await req.json().catch(() => ({ query: '' }));
  if (!query || !String(query).trim()) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const endpoint = (process.env.SEARCH_API_URL || '/api/websearch').trim();
  const url = new URL(endpoint, origin);
  url.searchParams.set('q', String(query));

  const r = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  const data: any = r.ok ? await r.json().catch(() => ({})) : {};
  const web = Array.isArray(data.results)
    ? data.results.map((x: any) => ({ ...x, source: 'web' }))
    : [];

  return NextResponse.json({ results: web });
}
