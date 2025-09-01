import { NextRequest, NextResponse } from 'next/server';

async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    const j = await res.json();
    return j?.idGroup?.rxnormId?.[0] || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ meds: [] });
  const tokens = Array.from(new Set(String(text).split(/[^A-Za-z0-9-]+/).filter(t => t.length > 2))).slice(0, 120);
  const meds: { token: string; rxcui: string }[] = [];
  for (const token of tokens) { try { const rxcui = await rxcuiForName(token); if (rxcui) meds.push({ token, rxcui }); } catch {} }
  const dedup = Object.values(meds.reduce((acc: any, m) => (acc[m.rxcui] = m, acc), {}));
  return NextResponse.json({ meds: dedup });
}
