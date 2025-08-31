import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http';

export const runtime = 'edge';

function clean(text: string) {
  return text
    .replace(/[^\w\s\-\/\+\.]/g, ' ')
    .replace(/\btab(?:let|)\b/gi, '')
    .replace(/\bcap(?:sule|)\b/gi, '')
    .replace(/\bmg\b/gi, '')
    .replace(/\bmcg\b/gi, '')
    .replace(/\bml\b/gi, '')
    .replace(/\bq[d|h]|bid|tid|qhs|qam|prn/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ngrams(words: string[], nMax=3) {
  const out:string[] = [];
  for (let n=1; n<=nMax; n++) for (let i=0; i+n<=words.length; i++) {
    const g = words.slice(i, i+n).join(' ');
    if (g.length >= 3) out.push(g);
  }
  return Array.from(new Set(out));
}

async function approx(term: string) {
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=3`;
  const { body: j } = await fetchWithTimeout(url, {}, 12000);
  const cand = j?.approximateGroup?.candidate || [];
  return cand
    .filter((c:any)=>Number(c?.score) >= 70)   // threshold; adjust if needed
    .map((c:any)=>({ rxcui: c.rxcui, score: Number(c.score) }));
}

async function rxcuiToName(rxcui: string) {
  const { body: j } = await fetchWithTimeout(
    `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/property.json?propName=RxNorm%20Name`,
    {},
    12000
  );
  return (j as any)?.propConceptGroup?.propConcept?.[0]?.propValue || rxcui;
}

export async function POST(req: NextRequest) {
  try {
    const { text }:{ text:string } = await req.json();
    const cleaned = clean(text || '');
    const grams = ngrams(cleaned.split(/\s+/).filter(Boolean));
    const hits: Record<string,{rxcui:string;score:number;name?:string}> = {};

    for (const g of grams) {
      const list = await approx(g).catch(()=>[]);
      for (const it of list) {
        const ex = hits[it.rxcui];
        if (!ex || it.score > ex.score) hits[it.rxcui] = it;
      }
    }

    // top 10 by score; resolve names
    const meds = await Promise.all(
      Object.values(hits)
        .sort((a,b)=>b.score-a.score)
        .slice(0, 10)
        .map(async (m)=>({ ...m, name: await rxcuiToName(m.rxcui) }))
    );

    return NextResponse.json({ meds });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
