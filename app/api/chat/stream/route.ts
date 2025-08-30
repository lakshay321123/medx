import { NextRequest } from 'next/server';
export const runtime = 'edge';

function likelyMedicationQuery(text: string) {
  const s = text.toLowerCase();
  return /\b(cough|syrup|tablet|capsule|medication|medicine|dose|otc)\b/.test(s);
}

function regionGuard(country: string | null) {
  const c = (country || '').toUpperCase();
  if (!c) return { regulator: 'local regulator', otcNote: 'Availability may vary; check local pharmacist.' };
  if (c === 'IN') return { regulator: 'CDSCO / ICMR', otcNote: 'Check with a pharmacist; products vary by state.' };
  if (c === 'US') return { regulator: 'FDA', otcNote: 'Consider OTC monograph products if appropriate.' };
  if (c === 'GB') return { regulator: 'NHS / BNF', otcNote: 'Follow NHS advice and consult a pharmacist.' };
  if (c === 'AU') return { regulator: 'TGA', otcNote: 'Follow TGA scheduling; consult a pharmacist.' };
  if (c === 'EU') return { regulator: 'EMA / national authority', otcNote: 'Country-specific rules apply.' };
  return { regulator: 'local regulator', otcNote: 'Availability may vary; check local pharmacist.' };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = body?.messages || [];
  const countryCode: string | null = body?.meta?.countryCode ?? null;

  const userMsg = [...messages].reverse().find((m: any) => m.role === 'user');
  const userText = userMsg?.content || '';
  const clientSystem = messages.find((m: any) => m.role === 'system')?.content || '';
  const { regulator, otcNote } = regionGuard(countryCode);

  const regionBlock = `\nYou must tailor all medical and medication advice to the user's country: ${countryCode || 'Unknown'}.\nRules:\n- Prefer generic (INN) names first. Only list brand examples from that country.\n- Cite local regulators/guidelines: e.g., CDSCO/ICMR (IN), FDA/USP (US), NHS/BNF (UK), EMA (EU), TGA (AU).\n- If the drug is prescription-only in that country, say so.\n- If your sources are US-only but country is not US, say "Based on globally available data; local guidance may differ." and prefer generic guidance over US brand names.\n- Avoid recommending unavailable or unapproved products in the user's country.\n`;

  const system = `You are MedX, a careful medical assistant. ${regionBlock}
General safety: do not diagnose; encourage clinician review; highlight red-flag symptoms; avoid dosing unless asked with sufficient context. Keep responses concise and structured.`;

  const medicationBlock = likelyMedicationQuery(userText)
    ? `For medication requests, answer with:\n- Generic ingredient first (e.g., "dextromethorphan"), then 2–3 brand examples **from ${countryCode || 'the user country'}** if widely available.\n- Regulatory note: ${regulator}. ${otcNote}\n- Warn about interactions and red-flag symptoms; avoid dosing unless explicitly needed and safe.`
    : '';

  const finalSystem = `${clientSystem ? clientSystem + '\n' : ''}${system}\n${medicationBlock}`;

  const base  = process.env.LLM_BASE_URL!;
  const model = process.env.LLM_MODEL_ID || 'llama-3.1-8b-instant';
  const key   = process.env.LLM_API_KEY!;
  const url = `${base.replace(/\/$/,'')}/chat/completions`;

  const filtered = messages.filter((m: any) => m.role !== 'system');
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, stream: true, temperature: 0.2, messages: [{ role: 'system', content: finalSystem }, ...filtered] })
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
