import { NextRequest, NextResponse } from 'next/server';
import { umlsFetch } from '@/lib/umls';

export async function GET(req: NextRequest) {
  const name = new URL(req.url).searchParams.get('q') || '';
  if (!name) return NextResponse.json({ rxcuis: [] });

  const s = await umlsFetch(`/search/current?string=${encodeURIComponent(name)}&pageNumber=1&pageSize=5`);
  const first = (s?.result?.results || [])[0];
  if (!first?.ui || first.ui === 'NONE') return NextResponse.json({ rxcuis: [] });

  const data = await umlsFetch(`/content/current/CUI/${encodeURIComponent(first.ui)}/atoms?sabs=RXNORM&pageNumber=1&pageSize=50`);
  const atoms = data?.result || [];
  const rxcuis = [...new Set(atoms.map((a: any) => a.code?.code).filter(Boolean))];
  return NextResponse.json({ cui: first.ui, rxcuis });
}
