import { askOpenAIJson, askGroqJson, hasOpenAI, hasGroq } from "@/lib/llm/safeLLM";

type NumDict = Record<string, number | string | boolean | null>;

export interface CalcSpec {
  name: string;
  formulaSpec: string;
  inputs: NumDict;
  localResult: number;
  precision?: number;
  tolerancePct?: number;
  strict?: boolean;
  timeoutMs?: number;
}

export interface CalcVerdict {
  status: "ok" | "blocked";
  final: number;
  tier: "openai" | "groq" | "local";
  attempts: number;
  agreeWithLocal: boolean;
  deltaAbs: number;
  deltaPct: number;
  explanation?: string;
  reason?: string;
}

function mkPrompt(spec: CalcSpec, verbose = false) {
  const precision = spec.precision ?? 2;
  return [
    `Formula: ${spec.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(spec.inputs)}`,
    `Local result: ${spec.localResult}`,
    `Required precision: ${precision} decimal places.`,
    verbose ? "Show each operation digit-by-digit." : "Show concise steps.",
    'Return JSON ONLY: {"result": <number>, "explanation": "<string>"}',
  ].join("\n");
}

function toFiniteNumber(x: unknown): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? n : null;
}

function evalVsLocal(finalNum: number, local: number, precision: number, tolerancePct: number) {
  const final = Number(finalNum.toFixed(precision));
  const deltaAbs = Math.abs(final - local);
  const denom = Math.max(1, Math.abs(local)); // stabilize tiny locals
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolerancePct;
  return { final, deltaAbs, deltaPct, pass };
}

/**
 * 3-tier verification:
 *  1) OpenAI authoritative IF within tolerance.
 *  2) Groq backup (never authoritative in strict mode).
 *  3) Local deterministic fallback.
 * If strict=true, block unless OpenAI passes.
 */
export async function finalizeCalc(spec: CalcSpec): Promise<CalcVerdict> {
  try {
    const precision = spec.precision ?? 2;
    const tolerancePct = spec.tolerancePct ?? 0; // default to exact match
    const timeoutMs = spec.timeoutMs ?? 7000;
    let attempts = 0;

    // Guard local first — never crash chat on bad locals
    if (!Number.isFinite(spec.localResult)) {
      return {
        status: spec.strict ? "blocked" : "ok",
        final: 0,
        tier: "local",
        attempts,
        agreeWithLocal: false,
        deltaAbs: NaN,
        deltaPct: NaN,
        reason: "Local non-finite.",
      };
    }

    // Kill switch
    if (process.env.CALC_AI_DISABLE === "1") {
      return {
        status: "ok",
        final: Number(spec.localResult.toFixed(precision)),
        tier: "local",
        attempts,
        agreeWithLocal: true,
        deltaAbs: 0,
        deltaPct: 0,
        explanation: "AI verification disabled.",
      };
    }

    // Tier 1: OpenAI
    if (hasOpenAI()) {
      for (const verbose of [false, true]) {
        attempts++;
        const r = await askOpenAIJson(mkPrompt(spec, verbose), timeoutMs);
        const n = r && toFiniteNumber((r as any).result);
        if (n !== null) {
          const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
          if (pass) {
            return { status: "ok", final, tier: "openai", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: (r as any).explanation || "" };
          }
          if (spec.strict) {
            return { status: "blocked", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "OpenAI outside tolerance (strict)." };
          }
          console.warn(`[triage] OpenAI mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return { status: "ok", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "OpenAI outside tolerance; using local." };
        }
      }
    }

    // Tier 2: Groq
    if (hasGroq()) {
      for (const verbose of [false, true]) {
        attempts++;
        const r = await askGroqJson(mkPrompt(spec, verbose), timeoutMs);
        const n = r && toFiniteNumber((r as any).result);
        if (n !== null) {
          const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
          if (spec.strict) {
            return { status: "blocked", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: pass, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "Strict mode requires OpenAI." };
          }
          if (pass) {
            return { status: "ok", final, tier: "groq", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: (r as any).explanation || "" };
          }
          console.warn(`[triage] Groq mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return { status: "ok", final: Number(spec.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: (r as any).explanation || "", reason: "Groq outside tolerance; using local." };
        }
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
      explanation: "AI unavailable; using local.",
      reason: spec.strict ? "Strict mode requires OpenAI." : undefined,
    };
  } catch (err) {
    console.error("[triage] Fatal:", err);
    const precision = spec.precision ?? 2;
    return {
      status: "ok",
      final: Number(spec.localResult.toFixed(precision)),
      tier: "local",
      attempts: 0,
      agreeWithLocal: true,
      deltaAbs: 0,
      deltaPct: 0,
      reason: "Caught fatal error; returned local.",
    };
  }
}
