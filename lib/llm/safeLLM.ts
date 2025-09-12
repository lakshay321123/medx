import { openaiText, groqChat } from "../llm";

const SYSTEM = [
  "You are a medical calculator.",
  "Recompute the given formula exactly and deterministically.",
  "Show arithmetic steps; no heuristics or ranges.",
  'Return JSON ONLY: {"result": <number>, "explanation": "<string>"}',
].join(" ");

export function hasOpenAI() { return !!process.env.OPENAI_API_KEY; }
export function hasGroq()   { return !!(process.env.LLM_API_KEY || process.env.GROQ_API_KEY); }

function stripFences(s: string) {
  return s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function coerceJson(anything: unknown): any | null {
  try {
    if (anything == null) return null;
    if (typeof anything === "object") return anything;
    let txt = String(anything);
    if (!txt) return null;
    txt = stripFences(txt);
    try { return JSON.parse(txt); } catch {}
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(stripFences(m[0]));
    const num = txt.match(/result[^0-9\-\.]*(-?\d+(?:\.\d+)?)/i);
    if (num) return { result: Number(num[1]), explanation: "Parsed from non-JSON response." };
    return null;
  } catch { return null; }
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

export async function askOpenAIJson(userPrompt: string, timeoutMs = 7000) {
  if (!hasOpenAI()) return null;
  try {
    const content = await withTimeout(
      (openaiText as any)({
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 400,
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
      }),
      timeoutMs
    );
    return coerceJson(content);
  } catch (err) {
    console.warn("[safeLLM] OpenAI error:", err);
    return null;
  }
}

export async function askGroqJson(userPrompt: string, timeoutMs = 7000) {
  if (!hasGroq()) return null;
  try {
    const content = await withTimeout(
      (groqChat as any)({
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0,
        max_tokens: 400,
        model: process.env.LLM_MODEL_ID || "llama3-70b-8192",
      } as any),
      timeoutMs
    );
    return coerceJson(content);
  } catch (err) {
    console.warn("[safeLLM] Groq error:", err);
    return null;
  }
}
