import { NextRequest, NextResponse } from 'next/server';

function jerr(code: string, message: string, status = 200) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jerr('bad_request', 'Invalid JSON payload');

    const BASE = process.env.LLM_BASE_URL;
    const KEY = process.env.LLM_API_KEY;
    const MODEL = process.env.LLM_MODEL_ID || process.env.LLM_MODEL || 'llama-3.1-8b-instant';

    if (!BASE) return jerr('missing_base_url', 'LLM_BASE_URL not set');
    if (!KEY) return jerr('missing_api_key', 'LLM_API_KEY not set');

    const messages: any[] = body.messages || [];
    if (!messages.length && body.question) {
      const role = body.role;
      messages.push({
        role: 'system',
        content:
          role === 'clinician'
            ? 'You are a clinical assistant. Be precise, cite sources if mentioned. Avoid medical advice; provide evidence and guideline pointers.'
            : 'You explain in simple, friendly language for patients. Avoid medical advice; encourage consulting a doctor.',
      });
      messages.push({ role: 'user', content: body.question });
    }

    const endpoint = new URL('/v1/chat/completions', BASE).toString();

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3 }),
    });

    const text = await upstream.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!upstream.ok) {
      const msg = json?.error?.message || text || `HTTP ${upstream.status}`;
      return jerr('llm_upstream_error', msg.slice(0, 400));
    }

    const content =
      json?.choices?.[0]?.message?.content ??
      json?.message?.content ??
      json?.output_text ??
      '';

    if (!content) return jerr('empty_completion', 'LLM returned empty content');

    return NextResponse.json({ ok: true, data: { content } });
  } catch (e: any) {
    console.error('api/chat exception', e);
    return jerr('server_exception', e?.message || 'Unexpected server error');
  }
}

