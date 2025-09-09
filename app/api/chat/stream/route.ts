import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import * as calc from '@/lib/medical/calculators';
export const runtime = 'edge';

const recentReqs = new Map<string, number>();

type Labs = { Na?: number; K?: number; Cl?: number; HCO3?: number; glucose?: number };

function extractLabs(messages: any[]): Labs {
  const text = messages.map((m: any) => m.content || '').join(' ');
  const pick = (re: RegExp) => {
    const match = text.match(re);
    return match ? parseFloat(match[1]) : undefined;
  };
  return {
    Na: pick(/\b(?:Na|Sodium)\s*(\d+(?:\.\d+)?)/i),
    K: pick(/\b(?:K|Potassium)\s*(\d+(?:\.\d+)?)/i),
    Cl: pick(/\b(?:Cl|Chloride)\s*(\d+(?:\.\d+)?)/i),
    HCO3: pick(/\b(?:HCO3|Bicarb(?:onate)?)\s*(\d+(?:\.\d+)?)/i),
    glucose: pick(/\b(?:glucose|glu)\s*(\d+(?:\.\d+)?)/i),
  };
}

export async function POST(req: NextRequest) {
  const { messages = [], context, clientRequestId, mode } = await req.json();
  const now = Date.now();
  for (const [id, ts] of recentReqs.entries()) {
    if (now - ts > 60_000) recentReqs.delete(id);
  }
  if (clientRequestId) {
    const ts = recentReqs.get(clientRequestId);
    if (ts && now - ts < 60_000) {
      return new Response(null, { status: 409 });
    }
    recentReqs.set(clientRequestId, now);
  }
  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  let finalMessages = messages.filter((m: any) => m.role !== 'system');

  if (mode === 'doctor' || mode === 'patient') {
    const labs = extractLabs(finalMessages);
    const notes: string[] = [];
    if (labs.Na && labs.Cl && labs.HCO3) {
      const ag = calc.computeAnionGap({ Na: labs.Na, K: labs.K, Cl: labs.Cl, HCO3: labs.HCO3 });
      notes.push(`Computed Anion Gap: ${ag.toFixed(1)} mmol/L`);
    }
    if (labs.Na && labs.glucose) {
      const corr = calc.correctSodiumForGlucose(labs.Na, labs.glucose);
      notes.push(`Corrected Sodium: ${corr.toFixed(1)} mmol/L`);
    }
    if (labs.K !== undefined) {
      if (calc.needsKBeforeInsulin(labs.K)) {
        notes.push(`⚠️ Potassium ${labs.K} < 3.3 → Replete K before insulin`);
      }
    }
    if (notes.length) {
      finalMessages = [
        { role: 'system', content: 'Use provided computed values (do not recalc by hand).' },
        { role: 'system', content: 'These deterministic calculations are pre-computed:' },
        { role: 'system', content: notes.join('\n') },
        ...finalMessages,
      ];
    }
  }
  if (context === 'profile') {
    try {
      const origin = req.nextUrl.origin;
      const headers = { cookie: req.headers.get('cookie') || '' } as any;
      const [s, p, pk] = await Promise.all([
        fetch(`${origin}/api/profile/summary`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${origin}/api/profile`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${origin}/api/profile/packet`, { headers }).then(r => r.json()).catch(() => ({ text: '' })),
      ]);
      const sys = profileChatSystem({
        summary: s.summary || s.text || '',
        reasons: s.reasons || '',
        profile: p?.profile || p || null,
        packet: pk.text || '',
      });
      finalMessages = [{ role: 'system', content: sys }, ...finalMessages];
    } catch {}
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: finalMessages,
    })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  // Pass-through SSE; frontend parses "data: {delta.content}"
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
