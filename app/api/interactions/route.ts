import { NextRequest, NextResponse } from 'next/server';
import { safeJson } from '@/lib/safeJson';
export async function POST(req: NextRequest) {
  const { rxcuis } = await req.json();
  if (!Array.isArray(rxcuis) || rxcuis.length < 2) {
    return NextResponse.json({ interactions: [], note: 'Need at least 2 RXCUIs' });
  }
  const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join('+'))}`;
  const res = await fetch(url);
  if (!res.ok) return new NextResponse('RxNav interaction error', { status: 500 });
  const data = await safeJson<any>(res);

  const out: any[] = [];
  for (const g of data.fullInteractionTypeGroup || []) {
    for (const t of g.fullInteractionType || []) {
      for (const p of t.interactionPair || []) {
        out.push({ description: p.description, severity: p.severity, source: 'RxNav' });
      }
    }
  }
  return NextResponse.json({ interactions: out });
}
