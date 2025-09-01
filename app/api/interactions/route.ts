import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const { rxcuis } = await req.json();
  if (!Array.isArray(rxcuis) || rxcuis.length < 2) {
    return NextResponse.json({ interactions: [], note: 'Need at least 2 RXCUIs' });
  }
  const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join('+'))}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return NextResponse.json({ interactions: [], note: 'RxNav request failed' }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ interactions: [], note: 'RxNav interaction error' }, { status: 502 });
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ interactions: [], note: 'RxNav non-JSON response' }, { status: 502 });
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ interactions: [], note: 'RxNav parse error' }, { status: 502 });
  }

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
