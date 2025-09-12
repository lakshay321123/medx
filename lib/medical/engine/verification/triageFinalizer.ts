// 3-tier: OpenAI -> Groq -> Local
import { openaiText, groqChat } from "@/lib/llm";

type NumDict = Record<string, number | string | boolean | null>;

export interface CalcSpec {
  name: string;
  formulaSpec: string;     // canonical formula string (units explicit)
  inputs: NumDict;         // raw inputs
  localResult: number;     // local deterministic value
  precision?: number;      // default 2
}

export interface CalcVerdict {
  final: number;           // authoritative number used by app
  tier: "openai" | "groq" | "local";
  explanation?: string;
  agreeWithLocal?: boolean;
  deltaAbs?: number;
  deltaPct?: number;
  attempts: number;
}

const SYSTEM_PROMPT = [
  "You are a medical calculator.",
  "Recompute the given formula exactly; do explicit arithmetic.",
  "Be deterministic. No ranges. No heuristics.",
  "Return JSON ONLY: {\"result\": number, \"explanation\": string}",
].join(" ");

function mkUserPrompt(spec: CalcSpec, verbose = false) {
  const precision = spec.precision ?? 2;
  const guard = verbose
    ? "Show each step digit-by-digit."
    : "Show concise steps.";
  return [
    `Formula: ${spec.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(spec.inputs)}`,
    `Local result: ${spec.localResult}`,
    `Required precision: ${precision} decimals.`,
    `${guard}`,
    `Return JSON ONLY: {"result": <number>, "explanation": "<string>"}`,
  ].join("\n");
}

function safeNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") { const n = Number(x); if (Number.isFinite(n)) return n; }
  return null;
}

async function askOpenAI(prompt: string, model?: string) {
  const content = await openaiText([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ], model || process.env.OPENAI_TEXT_MODEL || "gpt-5", 0);
  try { return JSON.parse(typeof content === "string" ? content : `${content}`); }
  catch { return null; }
}

async function askGroq(prompt: string, model?: string) {
  // groqChat should return a string; we enforce JSON format in prompt
  const content = await groqChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ], model || process.env.LLM_MODEL_ID || "llama3-70b-8192", 0);
  try { return JSON.parse(typeof content === "string" ? content : `${content}`); }
  catch { return null; }
}

export async function finalizeCalc(spec: CalcSpec): Promise<CalcVerdict> {
  const precision = spec.precision ?? 2;
  const denom = Math.max(1e-9, Math.abs(spec.localResult));

  // TIER 1: OpenAI (two attempts)
  let attempts = 0;
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askOpenAI(mkUserPrompt(spec, verbose));
    const n = r && safeNum(r.result);
    if (n !== null) {
      const final = Number(n.toFixed(precision));
      const deltaAbs = Math.abs(final - spec.localResult);
      const deltaPct = (deltaAbs / denom) * 100;
      return {
        final, tier: "openai", explanation: r.explanation || "",
        agreeWithLocal: deltaAbs < 1e-9, deltaAbs, deltaPct, attempts
      };
    }
  }

  // TIER 2: Groq (two attempts)
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askGroq(mkUserPrompt(spec, verbose));
    const n = r && safeNum(r.result);
    if (n !== null) {
      const final = Number(n.toFixed(precision));
      const deltaAbs = Math.abs(final - spec.localResult);
      const deltaPct = (deltaAbs / denom) * 100;
      return {
        final, tier: "groq", explanation: r.explanation || "",
        agreeWithLocal: deltaAbs < 1e-9, deltaAbs, deltaPct, attempts
      };
    }
  }

  // TIER 3: Local fallback (fail-safe)
  return {
    final: Number(spec.localResult.toFixed(precision)),
    tier: "local",
    explanation: "AI verification unavailable; using local deterministic result.",
    agreeWithLocal: true,
    deltaAbs: 0,
    deltaPct: 0,
    attempts,
  };
}
