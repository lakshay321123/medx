import { NextRequest, NextResponse } from 'next/server';

type MedxSuccess = {
  ok: true;
  data: {
    role: 'assistant';
    content: string; // markdown/plain
    citations?: Array<{ title: string; url: string }>;
  };
};

type MedxError = {
  ok: false;
  error: { code: string; message: string };
};

function errorJSON(code: string, message: string, status = 200) {
  const body: MedxError = { ok: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

async function callLLM(baseUrl: string, apiKey: string, body: any) {
  const r = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  // Try to read text first, then parse
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, text, json };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, meta } = await req.json();

    const BASE = process.env.LLM_BASE_URL?.trim();
    const KEY  = process.env.LLM_API_KEY?.trim();
    const MODEL= process.env.LLM_MODEL || 'llama-3.1-8b-instant'; // or your default

    if (!BASE) return errorJSON('missing_base_url', 'LLM_BASE_URL not set', 200);
    if (!KEY)  return errorJSON('missing_api_key', 'LLM_API_KEY not set', 200);

    // Build region/role-aware system message
    const country = meta?.countryCode ?? 'Unknown';
    const audience = meta?.mode === 'doctor'
      ? 'Audience is a clinician. Prefer codes, succinct bullets.'
      : 'Audience is a general user. Avoid jargon; keep it actionable and safe.';
    const system = `You are MedX, a careful medical assistant.
Country: ${country}.
${audience}
Medication guidance: prefer generics; cite local regulators when useful; avoid dosing unless safe & asked; flag red-flags.`;

    const llmBody = {
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        ...(messages ?? []),
      ],
      temperature: 0.3,
    };

    const resp = await callLLM(BASE, KEY, llmBody);

    if (!resp.ok) {
      // Provider returned a non-2xx; bubble a clean error
      const msg = resp.json?.error?.message || resp.text || 'LLM provider error';
      return errorJSON('llm_upstream_error', msg.slice(0, 400));
    }

    // Some providers put the completion in different fields; normalize:
    const content =
      resp.json?.choices?.[0]?.message?.content ??
      resp.json?.message?.content ??
      resp.json?.output_text ??
      '';

    if (!content) {
      return errorJSON('empty_completion', 'LLM returned empty content');
    }

    const out: MedxSuccess = {
      ok: true,
      data: {
        role: 'assistant',
        content,
        citations: resp.json?.citations ?? undefined,
      },
    };
    return NextResponse.json(out);
  } catch (e: any) {
    return errorJSON('server_exception', e?.message || 'Unexpected server error');
  }
}
