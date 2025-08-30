import { NextRequest, NextResponse } from 'next/server';

type MedxSuccess = { ok: true; data: { role: 'assistant'; content: string; citations?: Array<{title:string; url:string}> } };
type MedxError   = { ok: false; error: { code: string; message: string } };

function jerror(code: string, message: string, status = 200) {
  // 200 keeps client happy but payload.ok=false lets UI render a friendly note
  return NextResponse.json({ ok:false, error:{ code, message } } as MedxError, { status });
}

async function callLLM(baseUrl: string, apiKey: string, body: any) {
  const endpoint = new URL('/v1/chat/completions', baseUrl).toString();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const text = await res.text(); // always read text first to log on failure
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jerror('bad_request', 'Invalid JSON payload');

    const BASE = process.env.LLM_BASE_URL?.trim();
    const KEY  = process.env.LLM_API_KEY?.trim();
    const MODEL= process.env.LLM_MODEL?.trim() || 'llama-3.1-8b-instant';
    if (!BASE) return jerror('missing_base_url', 'LLM_BASE_URL not set');
    if (!KEY)  return jerror('missing_api_key', 'LLM_API_KEY not set');

    const country = body?.meta?.countryCode ?? 'Unknown';
    const audience = body?.meta?.mode === 'doctor'
      ? 'Audience is a clinician. Prefer codes, succinct bullets.'
      : 'Audience is a general user. Avoid jargon; keep it actionable and safe.';

    const system = `You are MedX, a careful medical assistant.
Country: ${country}.
${audience}
Medication guidance: prefer generics; cite local regulators when useful; avoid dosing unless safe & asked; flag red-flags.`;

    const llmBody = {
      model: MODEL,
      messages: [{ role: 'system', content: system }, ...(body?.messages || [])],
      temperature: 0.3,
    };

    const r = await callLLM(BASE, KEY, llmBody);

    // Log non-2xx details to Vercel logs for debugging
    if (!r.ok) {
      console.error('LLM upstream error:', { status: r.status, text: r.text?.slice(0, 500) });
      const message = r.json?.error?.message || r.text || `HTTP ${r.status}`;
      return jerror('llm_upstream_error', message.slice(0, 400));
    }

    const content =
      r.json?.choices?.[0]?.message?.content ??
      r.json?.message?.content ??
      r.json?.output_text ??
      '';

    if (!content) {
      console.error('Empty completion from LLM:', r.json ?? r.text);
      return jerror('empty_completion', 'LLM returned empty content');
    }

    const out: MedxSuccess = { ok: true, data: { role: 'assistant', content, citations: r.json?.citations ?? undefined } };
    return NextResponse.json(out);
  } catch (e: any) {
    console.error('MedX /api/medx handler exception:', e);
    return jerror('server_exception', e?.message || 'Unexpected server error');
  }
}

