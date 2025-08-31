import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Look up RXCUI for a drug name (exact-ish)
async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  return j?.idGroup?.rxnormId?.[0] || null;
}

// Clean a token so “Paracetamol-500mg tab” → “Paracetamol”
function cleanToken(t: string) {
  return t
    .replace(/[^\w\s\-\/\+\.]/g, ' ')
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|syrup|susp|drop(?:s)?|inj(?:ection)?|cream|gel|ointment)\b/gi, ' ')
    .replace(/\b(\d+(\.\d+)?)(mg|mcg|g|ml|iu)\b/gi, ' ')
    .replace(/\b(qd|bid|tid|qid|qhs|qam|prn|po|iv|im|sc)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'No file provided' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ ok:false, error:'File must be a PDF' }, { status: 415 });

    // pdf-parse works only on Node runtime (we set runtime above)
    const pdf = (await import('pdf-parse')).default;
    const buf = Buffer.from(await file.arrayBuffer());

    let text = '';
    try {
      const out = await pdf(buf);
      text = out.text || '';
    } catch (e:any) {
      return NextResponse.json({ ok:false, error:`PDF parse failed: ${e?.message || e}` }, { status: 200 });
    }

    if (!text.trim()) {
      return NextResponse.json({
        ok: true,
        text: '',
        meds: [],
        note: 'No selectable text found (likely a scanned PDF).'
      });
    }

    // Tokenize → clean → ngrams
    const rawTokens = String(text).split(/[^A-Za-z0-9-]+/).filter(t => t.length > 2);
    const base = Array.from(new Set(rawTokens.map(cleanToken).filter(Boolean)));
    // Build unigrams + bigrams + trigrams
    const grams = new Set<string>();
    for (let i=0;i<base.length;i++){
      grams.add(base[i]);
      if (i+1<base.length) grams.add(`${base[i]} ${base[i+1]}`);
      if (i+2<base.length) grams.add(`${base[i]} ${base[i+1]} ${base[i+2]}`);
    }

    const candidates = Array.from(grams).slice(0, 200);
    const found: { token:string; rxcui:string }[] = [];
    for (const token of candidates) {
      try {
        const rxcui = await rxcuiForName(token);
        if (rxcui) found.push({ token, rxcui });
      } catch {}
    }
    // Deduplicate by rxcui
    const meds = Object.values(
      found.reduce((acc:any, m) => (acc[m.rxcui] ||= m, acc), {})
    );

    return NextResponse.json({
      ok: true,
      text,
      meds,               // [{ token, rxcui }]
      note: meds.length ? undefined : 'No clear medicines detected.'
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
