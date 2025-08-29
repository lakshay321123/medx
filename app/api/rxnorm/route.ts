import { NextRequest, NextResponse } from 'next/server';
  export async function GET(req: NextRequest){ const q = new URL(req.url).searchParams.get('q') || 'metformin'; const r = await fetch(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(q)}`); const j = await r.json(); return NextResponse.json(j); }
