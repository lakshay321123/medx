import { NextRequest, NextResponse } from 'next/server';
import { umlsFetch } from '../../../../lib/umls';
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const cui = sp.get('cui') || ''; const target = sp.get('target') || 'ICD10CM';
  if (!cui) return NextResponse.json({ mappings: [] });
  const data = await umlsFetch(`/content/current/CUI/${encodeURIComponent(cui)}/atoms?sabs=${encodeURIComponent(target)}&pageNumber=1&pageSize=50`);
  const atoms = data?.result || [];
  const mappings = atoms.map((a: any) => ({ code: a.code?.code, term: a.name, source: a.rootSource, tty: a.termType, ui: a.ui }));
  return NextResponse.json({ mappings });
}
