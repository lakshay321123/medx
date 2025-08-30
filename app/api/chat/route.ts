import { NextRequest, NextResponse } from 'next/server';

function jerr(code: string, message: string, status = 200) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // 1) Parse incoming JSON
    const body = await req.json().catch(() => null);
    if (!body) return jerr('bad_request', 'Invalid JSON body');

    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages) return jerr('bad_request', 'Missing messages[]');

    // 2) Pull env (do NOT rename)
    const BASE  = process.env.LLM_BASE_URL;      // e.g., https://api.groq.com/openai
    const KEY   = process.env.LLM_API_KEY;       // e.g., gsk_...
    const MODEL = process.env.LLM_MODEL_ID || process.env.LLM_MODEL || 'llama-3.1-8b-instant';

    if (!BASE)  return jerr('missing_base', 'LLM_BASE_URL not set');
    if (!KEY)   return jerr('missing_key', 'LLM_API_KEY not set');
    if (!MODEL) return jerr('missing_model', 'LLM model not set');

    // 3) Build endpoint safely
    const endpoint = new URL('/v1/chat/completions', BASE).toString();

    // 4) Call upstream
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
        stream: false,
      }),
    });

    const raw = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { /* fallthrough */ }

    if (!upstream.ok) {
      const msg = data?.error?.message || raw || `HTTP ${upstream.status}`;
      return jerr('llm_upstream_error', msg.slice(0, 500));
    }

    // 5) Normalize content
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.message?.content ??
      data?.output_text ??
      '';

    if (!content) return jerr('empty_completion', 'LLM returned empty content');

    return NextResponse.json({ ok: true, data: { content } });
  } catch (e: any) {
    console.error('api/chat exception:', e);
    return jerr('server_exception', e?.message || 'Unexpected server error');
  }
}
