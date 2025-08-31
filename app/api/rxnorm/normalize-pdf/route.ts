import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Clean noisy tokens: "Paracetamol 500 mg tab" -> "Paracetamol"
function cleanToken(t: string) {
  return t
    .replace(/[^\w\s\-\+\/\.]/g, ' ')
    .replace(/\b(?:tab(?:let)?|cap(?:sule)?|syrup|susp(?:ension)?|drop(?:s)?|inj(?:ection)?|cream|gel|ointment|soln|solution)\b/gi, ' ')
    .replace(/\b(\d+(\.\d+)?)(mg|mcg|g|ml|iu)\b/gi, ' ')
    .replace(/\b(qd|od|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function rxcuiForName(name: string): Promise<string | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=2`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.idGroup?.rxnormId?.[0] || null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok:false, error:'No file provided' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ ok:false, error:'File must be a PDF' }, { status: 415 });

    const pdf = (await import('pdf-parse')).default;           // Node runtime only
    const buf = Buffer.from(await file.arrayBuffer());

    let text = '';
    try {
      const out = await pdf(buf);
      text = (out.text || '').replace(/\u0000/g, '').trim();
    } catch (e:any) {
      return NextResponse.json({ ok:false, error:`PDF parse error: ${e?.message||e}` }, { status: 200 });
    }

    if (!text) {
      return NextResponse.json({ ok:true, text:'', meds:[], note:'No selectable text found (likely a scanned PDF).'});
    }

    const words = text.split(/[^A-Za-z0-9-]+/).filter(w => w.length > 2);
    const cleaned = words.map(cleanToken).filter(Boolean);
    const grams = new Set<string>();
    for (let i=0;i<cleaned.length;i++){
      grams.add(cleaned[i]);
      if (i+1<cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i+1]}`);
      if (i+2<cleaned.length) grams.add(`${cleaned[i]} ${cleaned[i+1]} ${cleaned[i+2]}`);
    }

    const candidates = Array.from(grams).slice(0, 200);
    const found: { token:string; rxcui:string }[] = [];
    for (const token of candidates) {
      try {
        const r = await rxcuiForName(token);
        if (r) found.push({ token, rxcui: r });
      } catch {}
    }
    const meds = Object.values(found.reduce((acc:any, m) => (acc[m.rxcui] ||= m, acc), {}));

    return NextResponse.json({ ok:true, text, meds, note: meds.length ? undefined : 'No clear medicines detected.' });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
