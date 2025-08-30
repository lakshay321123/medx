import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest){
  const body = await req.json();
  const { question, role } = body;
  const countryCode: string | null = body?.meta?.countryCode ?? null;
  const base = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL_ID || 'llama3-8b-instruct';
  if(!base) return new NextResponse("LLM_BASE_URL not set", { status: 500 });

  const { regulator, otcNote } = regionGuard(countryCode);

  const regionBlock = `\nYou must tailor all medical and medication advice to the user's country: ${countryCode || 'Unknown'}.\nRules:\n- Prefer generic (INN) names first. Only list brand examples from that country.\n- Cite local regulators/guidelines: e.g., CDSCO/ICMR (IN), FDA/USP (US), NHS/BNF (UK), EMA (EU), TGA (AU).\n- If the drug is prescription-only in that country, say so.\n- If your sources are US-only but country is not US, say "Based on globally available data; local guidance may differ." and prefer generic guidance over US brand names.\n- Avoid recommending unavailable or unapproved products in the user's country.\n`;

  const system = `You are MedX, a careful medical assistant. ${regionBlock}
General safety: do not diagnose; encourage clinician review; highlight red-flag symptoms; avoid dosing unless asked with sufficient context. Keep responses concise and structured.`;

  const medicationBlock = likelyMedicationQuery(question)
    ? `For medication requests, answer with:\n- Generic ingredient first (e.g., "dextromethorphan"), then 2–3 brand examples **from ${countryCode || 'the user country'}** if widely available.\n- Regulatory note: ${regulator}. ${otcNote}\n- Warn about interactions and red-flag symptoms; avoid dosing unless explicitly needed and safe.`
    : '';

  const finalSystem = `${system}\n${medicationBlock}`;

  // OpenAI-compatible completion (v1/chat/completions)
  const res = await fetch(`${base.replace(/\/$/,'')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: finalSystem },
        { role: 'user', content: question }
      ],
      temperature: 0.2
    })
  });
  if(!res.ok){
    const t = await res.text();
    return new NextResponse(`LLM error: ${t}`, { status: 500 });
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";
  return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' }});
}
