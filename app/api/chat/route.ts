export async function POST(req: Request) {
  const { question, role } = await req.json();
  const base = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key = process.env.LLM_API_KEY;

  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
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
    const err = await res.text();
    return new Response(`LLM error: ${err}`, { status: 500 });
  }
  const json = await res.json();
  return new Response(json.choices?.[0]?.message?.content || '', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

