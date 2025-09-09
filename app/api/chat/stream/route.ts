import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractLabsFromText } from '@/lib/medical/extractLabs';
import * as calc from '@/lib/medical/calculators';
export const runtime = 'edge';

const recentReqs = new Map<string, number>();

export async function POST(req: NextRequest) {
  const { messages = [], context, clientRequestId } = await req.json();
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

  const userText = (messages || []).map((m:any)=>m?.content||"").join("\n");
  const labs = extractLabsFromText(userText);
  const notes: string[] = [];

  const ag = calc.computeAnionGap(labs);
  if (ag != null) notes.push(`Computed Anion Gap: ${ag.toFixed(1)} mmol/L`);

  const corrNa = calc.correctSodiumForGlucose(labs.Na, labs.glucose_mgdl);
  if (corrNa != null) notes.push(`Corrected Sodium (glucose): ${corrNa.toFixed(1)} mmol/L`);

  const osm = calc.effectiveOsmolality(labs);
  if (osm != null) notes.push(`Effective Osmolality (calc): ${osm.toFixed(0)} mOsm/kg`);

  if (calc.needsKBeforeInsulin(labs.K)) {
    notes.push(`⚠️ Potassium ${labs.K} < 3.3 → Replete K before insulin.`);
  }

  let finalMessages = messages.filter((m: any) => m.role !== 'system');
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

  if (notes.length) {
    const guard = "Use the pre-computed values below as source of truth; do not re-calculate by hand.";
    finalMessages = [
      { role: "system", content: guard },
      { role: "system", content: notes.join("\n") },
      ...finalMessages,
    ];
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
