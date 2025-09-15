export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.GOOGLE_CSE_KEY!;
  const cx  = process.env.GOOGLE_CSE_CX!;
  const r = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(q)}`,
    { cache: 'no-store' }
  );
  if (!r.ok) return NextResponse.json({ results: [] });

  const j = await r.json();
  const results = (j.items || []).map((it: any) => ({
    title: it.title || '',
    snippet: it.snippet || it.htmlSnippet || '',
    url: it.link || '',
    source: 'web'
  })).filter((x: any) => x.title && x.url);

  return NextResponse.json({ results });
}
