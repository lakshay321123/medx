import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { q, mode } = await req.json();
  const sys = mode === 'clinician'
    ? 'You are MedX, a clinical assistant. Provide concise, evidence-aware, structured answers with pointers to trusted sources (WHO, PubMed, ClinicalTrials.gov, openFDA). Do not diagnose; include red flags and next-steps.'
    : 'You are MedX, a patient-friendly explainer. Use simple language. Add a short safety note and encourage consulting a clinician. Do not diagnose.';

  const payload = {
    model: 'gpt-4o-mini', // placeholder; many vLLM servers mimic OpenAI API
    stream: true,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: q || 'Explain thyroid cancer treatments.' }
    ]
  };

  const llmUrl = process.env.LLM_BASE_URL || '';
  const headers:Record<string,string> = { 'Content-Type':'application/json' };
  if (process.env.LLM_API_KEY) headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;

  const upstream = await fetch(llmUrl, { method:'POST', headers, body: JSON.stringify(payload) });
  if (!upstream.ok || !upstream.body) {
    return new Response('LLM upstream error', { status: 500 });
  }
  return new Response(upstream.body, { headers: { 'Content-Type':'text/plain; charset=utf-8' }});
}
