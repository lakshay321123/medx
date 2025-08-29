import { NextRequest, NextResponse } from 'next/server';
  export async function GET(){ const r = await fetch('https://www.who.int/feeds/entity/news/en/rss.xml'); const x = await r.text(); return new NextResponse(x,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}}); }
