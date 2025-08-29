import { NextRequest, NextResponse } from 'next/server';
  export async function GET(req: NextRequest){ const q = new URL(req.url).searchParams.get('q') || 'metformin'; const r = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(q)}&pagesize=5`); const j = await r.json(); return NextResponse.json(j); }
