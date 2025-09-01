import { NextRequest, NextResponse } from 'next/server';
import pdfText from '@/lib/pdftext';
export const runtime = 'nodejs';

async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  try {
    const j = await res.json();
    return j?.idGroup?.rxnormId?.[0] || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text = '';
  try { text = await pdfText(buf); }
  catch (e:any){ return NextResponse.json({ error: 'PDF parse failed', detail: String(e) }, { status: 500 }); }

  if (!text.trim()) return NextResponse.json({ meds: [], note: 'No selectable text found.' });

  const tokens = Array.from(
    new Set(String(text).split(/[^A-Za-z0-9-]+/).filter(t => t.length > 2))
  ).slice(0, 120);
  const meds: { token: string; rxcui: string }[] = [];
  for (const token of tokens) {
    try {
      const rxcui = await rxcuiForName(token);
      if (rxcui) meds.push({ token, rxcui });
    } catch {
      // ignore failed lookups
    }
  }
  const dedup = Object.values(
    meds.reduce((acc: any, m) => ((acc[m.rxcui] = m), acc), {})
  );
  return NextResponse.json({ text, meds: dedup });
}
