import { askOpenAIJson, askGroqJson, hasOpenAI, hasGroq } from "@/lib/llm/safeLLM";

type NumDict = Record<string, number | string | boolean | null>;

export interface CalcSpec {
  name: string;
  formulaSpec: string;        // include units explicitly
  inputs: NumDict;
  localResult: number;        // deterministic result
  precision?: number;         // default 2
  tolerancePct?: number;      // default 1
  strict?: boolean;           // if true, only OpenAI pass allowed
  timeoutMs?: number;         // default 7000
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
  const denom = Math.max(1, Math.abs(local)); // stabilize tiny locals (avoid 100000% deltas)
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolerancePct;
  return { final, deltaAbs, deltaPct, pass };
}

export async function finalizeCalc(spec: CalcSpec): Promise<CalcVerdict> {
  try {
    const precision = spec.precision ?? 2;
    const tolerancePct = spec.tolerancePct ?? 1;
    const timeoutMs = spec.timeoutMs ?? 7000;
    let attempts = 0;

    // Guard local first — never crash chat on NaN/Inf
    if (!Number.isFinite(spec.localResult)) {
      return {
        status: spec.strict ? "blocked" : "ok",
        final: 0,
        tier: "local",
        attempts,
        agreeWithLocal: false,
        deltaAbs: NaN,
        deltaPct: NaN,
        reason: "Local result was non-finite.",
      };
    }

    // Env kill switch for emergencies
    if (process.env.CALC_AI_DISABLE === "1") {
      return {
        status: "ok",
        final: Number(spec.localResult.toFixed(precision)),
        tier: "local",
        attempts,
        agreeWithLocal: true,
        deltaAbs: 0,
        deltaPct: 0,
        explanation: "AI verification disabled via CALC_AI_DISABLE.",
      };
    }

    // Tier 1: OpenAI (if available)
    if (hasOpenAI()) {
      for (const verbose of [false, true]) {
        attempts++;
        const r = await askOpenAIJson(mkPrompt(spec, verbose), timeoutMs);
        const n = r && toFiniteNumber((r as any).result);
        if (n !== null) {
          const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
          if (pass) {
            return {
              status: "ok",
              final,
              tier: "openai",
              attempts,
              agreeWithLocal: true,
              deltaAbs, deltaPct,
              explanation: (r as any).explanation || "",
            };
          }
          if (spec.strict) {
            return {
              status: "blocked",
              final: Number(spec.localResult.toFixed(precision)),
              tier: "local",
              attempts,
              agreeWithLocal: false,
              deltaAbs, deltaPct,
              explanation: (r as any).explanation || "",
              reason: "OpenAI outside tolerance (strict).",
            };
          }
          // Non-strict: prefer safe local if OpenAI disagrees
          console.warn(`[triage] OpenAI mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return {
            status: "ok",
            final: Number(spec.localResult.toFixed(precision)),
            tier: "local",
            attempts,
            agreeWithLocal: false,
            deltaAbs, deltaPct,
            explanation: (r as any).explanation || "",
            reason: "OpenAI outside tolerance; using local.",
          };
        }
      }
    }

    // Tier 2: Groq (if available)
    if (hasGroq()) {
      for (const verbose of [false, true]) {
        attempts++;
        const r = await askGroqJson(mkPrompt(spec, verbose), timeoutMs);
        const n = r && toFiniteNumber((r as any).result);
        if (n !== null) {
          const { final, deltaAbs, deltaPct, pass } = evalVsLocal(n, spec.localResult, precision, tolerancePct);
          if (spec.strict) {
            return {
              status: "blocked",
              final: Number(spec.localResult.toFixed(precision)),
              tier: "local",
              attempts,
              agreeWithLocal: pass,
              deltaAbs, deltaPct,
              explanation: (r as any).explanation || "",
              reason: "Strict mode requires OpenAI; Groq used as info only.",
            };
          }
          if (pass) {
            return {
              status: "ok",
              final,
              tier: "groq",
              attempts,
              agreeWithLocal: true,
              deltaAbs, deltaPct,
              explanation: (r as any).explanation || "",
            };
          }
          console.warn(`[triage] Groq mismatch ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return {
            status: "ok",
            final: Number(spec.localResult.toFixed(precision)),
            tier: "local",
            attempts,
            agreeWithLocal: false,
            deltaAbs, deltaPct,
            explanation: (r as any).explanation || "",
            reason: "Groq outside tolerance; using local.",
          };
        }
      }
    }

    // Tier 3: Local
    return {
      status: spec.strict ? "blocked" : "ok",
      final: Number(spec.localResult.toFixed(precision)),
      tier: "local",
      attempts,
      agreeWithLocal: true,
      deltaAbs: 0,
      deltaPct: 0,
      explanation: "AI unavailable or invalid; using local.",
      reason: spec.strict ? "Strict mode requires OpenAI; none succeeded." : undefined,
    };
  } catch (err) {
    // Panic-proof: absolutely never throw up to chat
    console.error("[triage] Fatal error:", err);
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

