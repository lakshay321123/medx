import { NextRequest, NextResponse } from 'next/server';

function classify(q:string){
  const l = (q||'').toLowerCase();
  if(l.includes('near me') || l.includes('nearby')) return 'NEARBY';
  return 'OTHER';
}

function makeFollowups(intent:string, sections:any, mode:'patient'|'doctor', query:string): string[] {
  const out: string[] = [];
  if (intent === 'NEARBY') {
    out.push('Show more within 10 km', 'Open now', 'Directions to the closest');
  }
  if (intent === 'DRUGS_LIST' && (sections?.interactions?.length || 0) > 0) {
    out.push('Explain these interactions simply', 'Are there safer alternatives?', 'What should I ask my doctor?');
  }
  if (intent === 'DIAGNOSIS_QUERY') {
    if (mode === 'doctor') {
      out.push('Latest clinical trials', 'Common ICD-10 codes', 'SNOMED terms');
    } else {
      out.push('Simple explanation', 'What tests are usually done?', 'Questions to ask my doctor');
    }
  }
  if ((sections?.trials?.length || 0) > 0) {
    out.push('Summarize trial eligibility', 'Any phase 3 results?');
  }
  if (!out.length) out.push('Explain in simpler words', 'Show trusted sources');
  return Array.from(new Set(out)).slice(0, 5);
}

export async function POST(req: NextRequest){
  const { q, role, coords } = await req.json();
  const intent = classify(q);
  const mode = role === 'clinician' ? 'doctor' : 'patient';
  let sections: any = {};
  if(intent === 'NEARBY'){
    if(process.env.FEATURE_NEARBY !== 'on'){
      sections.nearby = { disabled:true };
      return NextResponse.json({ intent, sections, followups: makeFollowups(intent, sections, mode, q) });
    }
    if(!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number'){
      sections.needsLocation = true;
      return NextResponse.json({ intent, sections, followups: makeFollowups(intent, sections, mode, q) });
    }
    const res = await fetch(`${req.nextUrl.origin}/api/nearby`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lat: coords.lat, lng: coords.lng, kind: q })});
    const list = await res.json();
    sections.nearby = list;
    return NextResponse.json({ intent, sections, followups: makeFollowups(intent, sections, mode, q) });
  }
  const upstream = await fetch(`${req.nextUrl.origin}/api/chat`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: q, role })});
  const text = await upstream.text();
  return NextResponse.json({ intent, sections, answer: text, followups: makeFollowups(intent, sections, mode, q) });
}
