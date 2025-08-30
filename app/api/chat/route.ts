import { NextRequest, NextResponse } from 'next/server';

function jerr(code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } });
}

export async function POST(req: NextRequest) {
  try {
    const { question, role } = await req.json();
    const base = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
    if (!base) return jerr('missing_base_url', 'LLM_BASE_URL not set');

    const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              role === 'clinician'
                ? 'You are a clinical assistant. Be precise, cite sources if mentioned. Avoid medical advice; provide evidence and guideline pointers.'
                : 'You explain in simple, friendly language for patients. Avoid medical advice; encourage consulting a doctor.',
          },
          { role: 'user', content: question },
        ],
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('LLM error', t);
      return jerr('llm_upstream_error', t);
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    console.error('LLM error', e);
    return jerr('llm_upstream_error', e?.message || 'Provider error');
  }
}
