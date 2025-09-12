import { openaiText, groqChat } from "@/lib/llm";

// ---------- Types ----------
type NumDict = Record<string, number | string | boolean | null>;

export interface CalcSpec {
  name: string;
  formulaSpec: string;        // make units explicit here
  inputs: NumDict;
  localResult: number;        // deterministic calculator output
  precision?: number;         // default 2
  tolerancePct?: number;      // default 1
  strict?: boolean;           // if true, require OpenAI pass; otherwise fallback ok
  timeoutMs?: number;         // default 7000 per attempt
}

export interface CalcVerdict {
  status: "ok" | "blocked";
  final: number;              // authoritative number for UI
  tier: "openai" | "groq" | "local";
  attempts: number;
  agreeWithLocal: boolean;
  deltaAbs: number;
  deltaPct: number;
  explanation?: string;
  reason?: string;
}

// ---------- Utils ----------
const SYSTEM_PROMPT = [
  "You are a medical calculator.",
  "Recompute the given formula exactly and deterministically.",
  "Show arithmetic steps. No heuristics, no ranges.",
  'Return JSON ONLY: {"result": <number>, "explanation": "<string>"}'
].join(" ");

const stripFences = (s: string) =>
  s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

function coerceJson(anything: unknown): any | null {
  try {
    if (anything == null) return null;
    if (typeof anything === "object") return anything;                    // already object
    let txt = String(anything);
    if (!txt) return null;
    txt = stripFences(txt);
    // If it's not valid JSON, try to salvage just the first JSON object
    try { return JSON.parse(txt); } catch {}
    const match = txt.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(stripFences(match[0]));
    // Last ditch: extract a number like "result: 16"
    const num = txt.match(/result[^0-9\-\.]*(-?\d+(?:\.\d+)?)/i);
    if (num) return { result: Number(num[1]), explanation: "Parsed from non-JSON response." };
    return null;
  } catch { return null; }
}

function toFiniteNumber(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

function mkUserPrompt(spec: CalcSpec, verbose = false) {
  const precision = spec.precision ?? 2;
  const parts = [
    `Formula: ${spec.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(spec.inputs)}`,
    `Local result: ${spec.localResult}`,
    `Required precision: ${precision} decimal places.`,
    verbose ? "Show each operation digit-by-digit." : "Show concise steps.",
    'Return JSON ONLY: {"result": <number>, "explanation": "<string>"}',
  ];
  return parts.join("\n");
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function evalVsLocal(finalNum: number, local: number, precision: number, tolerancePct: number) {
  const final = Number(finalNum.toFixed(precision));
  const deltaAbs = Math.abs(final - local);
  const denom = Math.max(1e-9, Math.abs(local));
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolerancePct;
  return { final, deltaAbs, deltaPct, pass };
}

// ---------- LLM callers (always safe) ----------
async function askOpenAI(prompt: string, timeoutMs: number) {
  try {
    const res = await withTimeout(
      openaiText(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        process.env.OPENAI_TEXT_MODEL || "gpt-5",
        0
      ),
      timeoutMs
    );
    return coerceJson(res);
  } catch (err) {
    console.warn("[triageFinalizer] OpenAI error:", err);
    return null;
  }
}

async function askGroq(prompt: string, timeoutMs: number) {
  try {
    const res = await withTimeout(
      groqChat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        process.env.LLM_MODEL_ID || "llama3-70b-8192",
        0
      ),
      timeoutMs
    );
    return coerceJson(res);
  } catch (err) {
    console.warn("[triageFinalizer] Groq error:", err);
    return null;
  }
}

// ---------- Main 3-tier orchestrator ----------
export async function finalizeCalc(spec: CalcSpec): Promise<CalcVerdict> {
  const precision = spec.precision ?? 2;
  const tolerancePct = spec.tolerancePct ?? 1;
  const timeoutMs = spec.timeoutMs ?? 7000;
  let attempts = 0;

  // Guard against bad local results (NaN/Infinity) so chat never crashes
  if (!Number.isFinite(spec.localResult)) {
    return {
      status: spec.strict ? "blocked" : "ok",
      final: 0,
      tier: "local",
      attempts,
      agreeWithLocal: false,
      deltaAbs: NaN,
      deltaPct: NaN,
      reason: "Local calculator returned non-finite value.",
    };
  }

  // Tier 1: OpenAI (concise then verbose)
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askOpenAI(mkUserPrompt(spec, verbose), timeoutMs);
    const n = r && toFiniteNumber((r as any).result);
    if (n !== null) {
      const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
      if (pass) {
        return { status: "ok", final, tier: "openai", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: (r as any).explanation || "" };
      }
      if (spec.strict) {
        return { status: "blocked", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "OpenAI outside tolerance (strict)." };
      }
      // Non-strict: safety first → local
      console.warn(`[triageFinalizer] OpenAI mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
      return { status: "ok", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "OpenAI outside tolerance; using local." };
    }
  }

  // Tier 2: Groq (concise then verbose)
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askGroq(mkUserPrompt(spec, verbose), timeoutMs);
    const n = r && toFiniteNumber((r as any).result);
    if (n !== null) {
      const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
      if (spec.strict) {
        return { status: "blocked", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: pass, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "Strict mode requires OpenAI success." };
      }
      if (pass) {
        return { status: "ok", final, tier: "groq", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: (r as any).explanation || "" };
      }
      console.warn(`[triageFinalizer] Groq mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
      return { status: "ok", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "Groq outside tolerance; using local." };
    }
  }

  // Tier 3: Local fallback
  return {
    status: spec.strict ? "blocked" : "ok",
    final: Number(spec.localResult.toFixed(precision)),
    tier: "local",
    attempts,
    agreeWithLocal: true,
    deltaAbs: 0,
    deltaPct: 0,
    explanation: "AI verification unavailable; using local deterministic result.",
    reason: spec.strict ? "Strict mode requires OpenAI; none succeeded." : undefined,
  };
}

