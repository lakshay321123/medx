import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/http';

export const runtime = 'edge';

/* ------------------------------ helpers ------------------------------ */

function clean(text: string): string {
  // Normalize punctuation → spaces (avoid gluing words), strip common form/units/frequency
  return text
    .replace(/[^\w\s\-\/+\.]/g, ' ') // keep basic word chars, space, - / + .
    .replace(/\b(tab(?:let)?|cap(?:sule)?|syrup|susp(?:ension)?|drop(?:s)?|inj(?:ection)?|cream|gel|ointment|soln|solution)\b/gi, ' ')
    .replace(/\b(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu)\b/gi, ' ')
    .replace(/\b(qd|qh|bid|tid|qid|qhs|qam|prn|po|iv|im|sc|hs|ac|pc)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ngrams(words: string[], nMax = 3, limit = 150): string[] {
  const out: string[] = [];
  for (let n = 1; n <= nMax; n++) {
    for (let i = 0; i + n <= words.length; i++) {
      const g = words.slice(i, i + n).join(' ');
      if (g.length >= 3) out.push(g);
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  // unique, preserve order
  const seen = new Set<string>();
  return out.filter((g) => (seen.has(g) ? false : (seen.add(g), true)));
}

type ApproxHit = { rxcui: string; score: number };

async function approx(term: string): Promise<ApproxHit[]> {
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(
    term
  )}&maxEntries=3`;
  const { body: j } = await fetchWithTimeout(url, {}, 12000);
  const cand = (j?.approximateGroup?.candidate ?? []) as Array<{ rxcui?: string; score?: string }>;
  return cand
    .filter((c) => c?.rxcui && Number(c?.score) >= 70)
    .map((c) => ({ rxcui: String(c.rxcui), score: Number(c.score) }))
    .slice(0, 3);
}

async function rxcuiToName(rxcui: string): Promise<string> {
  const u = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/property.json?propName=RxNorm%20Name`;
  const { body: j } = await fetchWithTimeout(u, {}, 12000);
  return (j as any)?.propConceptGroup?.propConcept?.[0]?.propValue || rxcui;
}

// Simple concurrency limiter (edge-safe)
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const ret: R[] = [];
  let idx = 0;
  const run = async () => {
    while (idx < items.length) {
      const i = idx++;
      ret[i] = await worker(items[i]);
    }
  };
  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return ret;
}

/* -------------------------------- route ------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => null) as { text?: string } | null;
    const raw = (data?.text ?? '').trim();
    if (!raw) {
      return NextResponse.json({ meds: [], note: 'No text provided.' }, { status: 200 });
    }

    const cleaned = clean(raw);
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return NextResponse.json({ meds: [], note: 'Nothing recognizable after cleaning.' });
    }

    const grams = ngrams(tokens, 3, 150);

    // Query approx in parallel with a modest concurrency to avoid rate limits
    const approxBatches = await mapLimit(grams, 6, async (g) => {
      try {
        return await approx(g);
      } catch {
        return [] as ApproxHit[];
      }
    });

    // Merge hits by best score
    const best: Record<string, ApproxHit> = {};
    for (const batch of approxBatches) {
      for (const hit of batch) {
        const exist = best[hit.rxcui];
        if (!exist || hit.score > exist.score) best[hit.rxcui] = hit;
      }
    }

    const top = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 10);

    // Resolve human names with concurrency limit
    const meds = await mapLimit(top, 6, async (m) => ({
      ...m,
      name: await rxcuiToName(m.rxcui),
    }));

    return NextResponse.json({
      detectedType: 'prescription',
      meds,
      note: meds.length ? undefined : 'No medications confidently recognized.',
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
