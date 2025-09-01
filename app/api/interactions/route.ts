import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { rxcuis } = await req.json();
    if (!Array.isArray(rxcuis) || rxcuis.length < 2) {
      return NextResponse.json({ interactions: [], note: 'Need at least 2 RXCUIs' });
    }
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${encodeURIComponent(rxcuis.join('+'))}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ interactions: [] });
      }
      const t = await res.text();
      return NextResponse.json(
        { error: 'RxNav interaction error', detail: t || res.status },
        { status: 500 }
      );
    }
    const data = await res.json();

    const out: any[] = [];
    for (const g of data.fullInteractionTypeGroup || []) {
      for (const t of g.fullInteractionType || []) {
        for (const p of t.interactionPair || []) {
          out.push({ description: p.description, severity: p.severity, source: 'RxNav' });
        }
      }
    }
    return NextResponse.json({ interactions: out });
  } catch (e:any) {
    return NextResponse.json({ error: 'Internal server error', detail: String(e) }, { status: 500 });
  }
}
