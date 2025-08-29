import { NextRequest, NextResponse } from 'next/server';
  export async function GET(req: NextRequest){
    const q = new URL(req.url).searchParams.get('q') || 'thyroid cancer';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmax=5&api_key=${process.env.NCBI_API_KEY||''}`;
    const res = await fetch(url);
    const xml = await res.text();
    return new NextResponse(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
  }
