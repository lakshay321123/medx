import { NextRequest } from 'next/server';
import { profileChatSystem } from '@/lib/profileChatSystem';
import { extractAll, canonicalizeInputs } from '@/lib/medical/engine/extract';
import { computeAll } from '@/lib/medical/engine/computeAll';
import { composeCalcPrelude } from '@/lib/medical/engine/prelude';
import { ensureMinDelay, minDelayMs } from '@/lib/utils/ensureMinDelay';

// Keep doc-mode clinical prelude tight & relevant
function filterComputedForDocMode(items: any[], latestUser: string) {
  const msg = (latestUser || '').toLowerCase();
  const mentions = (s: string) => msg.includes(s);
  const isRespContext = mentions('cough') || mentions('fever') || mentions('cold') || mentions('breath') || mentions('sore throat');
  const needsPEContext = mentions('chest pain') || mentions('pleur') || mentions('shortness of breath') || /\bsob\b/.test(msg);
  return items
    // basic sanity
    .filter((r: any) => r && (Number.isFinite(r.value) || typeof r.value === 'string'))
    // a few clinically relevant filters
    .filter((r: any) => {
      if (isRespContext && r.id?.includes('pao2')) return true;
      if (needsPEContext && /well?s|geneva|d[- ]dimer/i.test(r.id||'')) return true;
      return true;
    });
}

function pickProvider(mode?: string) {
  const basic = (mode || '').toLowerCase() === 'basic' || (mode || '').toLowerCase() === 'casual';
  return basic ? 'groq' : 'openai';
}

export async function POST(req: NextRequest) {
  const { messages = [], context, clientRequestId, mode } = await req.json();
  const showClinicalPrelude = (mode === 'doctor' || mode === 'research');
  const provider = pickProvider(mode);
  const minMs = minDelayMs();

  const now = Date.now();
  const recentReqs = new Map<string, number>();
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
  // Resolve model + URL per provider
  const isGroq = provider === 'groq';
  const url = isGroq
    ? `${(process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')}/chat/completions`
    : `https://api.openai.com/v1/chat/completions`;
  const model = isGroq
    ? (process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant')
    : (process.env.OPENAI_TEXT_MODEL || 'gpt-5');
  const key = isGroq
    ? (process.env.GROQ_API_KEY || process.env.LLM_API_KEY)
    : process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(`Missing API key for ${provider}`, { status: 500 });
  }

  let finalMessages = messages.filter((m: any) => !!m?.content);

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
  // ===== Calculators prelude: only if not disabled and in clinical modes
  let __calcPrelude = '';
  const calcDisabled = (process.env.CALC_AI_DISABLE || '0') === '1';
  const latestUser = finalMessages.slice().reverse().find(m=>m.role==='user')?.content || '';
  if (!calcDisabled && (showClinicalPrelude || provider === 'openai')) {
    try {
      const extracted = extractAll(latestUser);
      const canonical = canonicalizeInputs(extracted);
      const computed = computeAll(canonical);
      const filtered = filterComputedForDocMode(computed, latestUser);
      __calcPrelude = composeCalcPrelude(filtered);
    } catch { /* non-fatal */ }
  }
  if (__calcPrelude && finalMessages.length && finalMessages[0]?.role === 'system') {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  } else if (__calcPrelude) {
    finalMessages = [{ role: 'system', content: __calcPrelude }, ...finalMessages];
  }

  const payload = {
    model,
    stream: true,
    temperature: isGroq ? 0 : 0.1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    messages: finalMessages,
  };

  const doFetch = () => fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(payload)
  });

  // Enforce a *minimum* latency before returning any bytes
  const upstream = await ensureMinDelay(doFetch(), minMs);

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }

  // Pass-through SSE; frontend parses "data: {delta.content}"
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
  });
}
