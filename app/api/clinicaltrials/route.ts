import { NextRequest, NextResponse } from 'next/server';
  export async function GET(req: NextRequest){
    const q = new URL(req.url).searchParams.get('q') || 'cancer';
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(q)}&pageSize=5`;
    const res = await fetch(url);
    const j = await res.json();
    return NextResponse.json(j);
  }
