import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import { composeCalcPrelude } from "@/lib/medical/engine/prelude";
import { extractAll, canonicalizeInputs } from "@/lib/medical/engine/extract";
import { computeAll } from "@/lib/medical/engine/computeAll";
import { callGroq } from "@/lib/llm/groq";

export async function POST(req: Request) {
  const { messages = [], mode } = await req.json();
  const lastUser = messages.slice().reverse().find((m:any)=>m.role==='user')?.content || '';
  const provider = (mode || '').toLowerCase() === 'basic' || (mode || '').toLowerCase() === 'casual' ? 'groq' : 'openai';
  const minMs = (parseInt(process.env.MIN_OUTPUT_DELAY_SECONDS || "", 10) || 10) * 1000;

  if (provider === 'groq') {
    const reply = await ensureMinDelay(callGroq(messages, { temperature: 0.2, max_tokens: 1200 }), minMs);
    return NextResponse.json({ ok: true, reply });
  }

  // OpenAI final say path (non-basic chats). Feed calculators prelude first.
  let prelude = '';
  if ((process.env.CALC_AI_DISABLE || '0') !== '1') {
    try {
      const extracted = extractAll(lastUser);
      const canonical = canonicalizeInputs(extracted);
      const computed = computeAll(canonical);
      prelude = composeCalcPrelude(computed);
    } catch {}
  }
  const system = prelude ? `Use these pre-computed values if consistent:\n${prelude}` : 'Validate all calculations before answering.';
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-5';
  const work = oai.chat.completions.create({ model, temperature: 0.1, messages: [{ role:'system', content: system }, ...messages] })
                 .then(r => r.choices?.[0]?.message?.content || "");
  const reply = await ensureMinDelay(work, minMs);
  return NextResponse.json({ ok: true, reply });
}
