import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdftext';
import { ocrBuffer } from '@/lib/ocr';
export const runtime = 'nodejs';

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
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text = '';
  let usedOCR = false;
  try {
    const res = await extractTextFromPDF(buf);
    text = res.text;
    if (res.pagesWithText === 0 || text.trim().length < 20) {
      const o = await ocrBuffer(buf);
      text = o.text;
      usedOCR = o.usedOCR;
    }
  } catch (e:any){
    const o = await ocrBuffer(buf);
    text = o.text;
    usedOCR = o.usedOCR;
  }

  const extraction = usedOCR ? 'OCR fallback used' : 'PDF text extracted';

  if (!text.trim()) return NextResponse.json({ meds: [], extraction });

  const tokens = Array.from(
    new Set(String(text).split(/[^A-Za-z0-9-]+/).filter(t => t.length > 2))
  );
  const meds: { token: string; rxcui: string }[] = [];
  for (let i = 0; i < tokens.length; i += 120) {
    const batch = tokens.slice(i, i + 120);
    for (const token of batch) {
      try {
        const rxcui = await rxcuiForName(token);
        if (rxcui) meds.push({ token, rxcui });
      } catch {
        // ignore failed lookups
      }
    }
  }
  const dedup = Object.values(
    meds.reduce((acc: any, m) => ((acc[m.rxcui] = m), acc), {})
  );
  return NextResponse.json({ text, meds: dedup, extraction });
}
