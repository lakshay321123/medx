import { NextRequest, NextResponse } from 'next/server';

function classify(q:string){
  const l = (q||'').toLowerCase();
  if(l.includes('near me') || l.includes('nearby')) return 'NEARBY';
  return 'OTHER';
}

export async function POST(req: NextRequest){
  const { q, role, coords } = await req.json();
  const intent = classify(q);
  if(intent === 'NEARBY'){
    if(process.env.FEATURE_NEARBY !== 'on'){
      return NextResponse.json({ intent, sections:{ nearby:{ disabled:true }}});
    }
    if(!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number'){
      return NextResponse.json({ intent, sections:{ needsLocation: true }});
    }
    const res = await fetch(`${req.nextUrl.origin}/api/nearby`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ lat: coords.lat, lng: coords.lng, kind: q })});
    const list = await res.json();
    return NextResponse.json({ intent, sections:{ nearby: list }});
  }
  const upstream = await fetch(`${req.nextUrl.origin}/api/chat`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: q, role })});
  const text = await upstream.text();
  return NextResponse.json({ intent, answer: text });
}
