import { NextRequest } from 'next/server';
import * as ecg from '@/lib/medical/ecg';
import { profileChatSystem } from '@/lib/profileChatSystem';
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

  const userText = messages
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content)
    .join(' ');
  const notes: string[] = [];
  const qtMatch = userText.match(/qt[^0-9]*([0-9]{3,4})/i);
  const hrMatch = userText.match(/heart rate[^0-9]*([0-9]{2,3})/i);
  if (qtMatch && hrMatch) {
    const qt = Number(qtMatch[1]);
    const hr = Number(hrMatch[1]);
    const frid = ecg.qtcFridericia(qt, hr);
    const baz = ecg.qtcBazett(qt, hr);
    notes.push(`QTc (Fridericia): ${frid.toFixed(0)} ms`);
    notes.push(`QTc (Bazett): ${baz.toFixed(0)} ms`);
    const kMatch = userText.match(/k[^0-9]*([0-9.]+)/i);
    const mgMatch = userText.match(/mg[^0-9]*([0-9.]+)/i);
    const adj = ecg.adjustQtcForElectrolytes(
      frid,
      kMatch ? Number(kMatch[1]) : undefined,
      mgMatch ? Number(mgMatch[1]) : undefined,
    );
    if (adj !== frid) notes.push(`QTc adjusted for electrolytes: ${adj.toFixed(0)} ms`);
  }

  let finalMessages = messages.filter((m: any) => m.role !== 'system');
  if (notes.length) {
    finalMessages = [
      {
        role: 'system',
        content:
          'These deterministic ECG values are computed by code — use them as source of truth, do not recalc.',
      },
      { role: 'system', content: notes.join('\n') },
      ...finalMessages,
    ];
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
