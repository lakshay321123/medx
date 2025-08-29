import { NextRequest, NextResponse } from 'next/server';
import { umlsFetch } from '@/lib/umls';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (!q) return NextResponse.json({ results: [] });
  const data = await umlsFetch(`/search/current?string=${encodeURIComponent(q)}&pageNumber=1&pageSize=25`);
  const results = (data?.result?.results || []).map((r: any) => ({
    name: r.name, ui: r.ui, rootSource: r.rootSource
  }));
  return NextResponse.json({ results });
}
