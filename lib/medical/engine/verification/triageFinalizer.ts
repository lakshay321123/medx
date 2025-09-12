import { askOpenAIJson, askGroqJson, hasOpenAI, hasGroq } from "@/lib/llm/safeLLM";

export interface CalcSpec {
  name: string;
  formulaSpec: string;
  inputs: Record<string, any>;
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

function mkPrompt(s: CalcSpec, verbose = false) {
  const precision = s.precision ?? 2;
  return [
    `Formula: ${s.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(s.inputs)}`,
    `Local result: ${s.localResult}`,
    `Required precision: ${precision} decimal places.`,
    verbose ? "Show each operation digit-by-digit." : "Show concise steps.",
    'Return JSON ONLY: {"result": <number>, "explanation": "<string>"}',
  ].join("\n");
}
const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN);
const good = (x: unknown) => Number.isFinite(num(x));

function evaluate(n: number, local: number, precision: number, tolPct: number) {
  const final = Number(n.toFixed(precision));
  const deltaAbs = Math.abs(final - local);
  const denom = Math.max(1, Math.abs(local));
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolPct;
  return { final, deltaAbs, deltaPct, pass };
}

export async function finalizeCalc(s: CalcSpec): Promise<CalcVerdict> {
  try {
    const precision = s.precision ?? 2;
    const tolPct = s.tolerancePct ?? 0;
    const timeoutMs = s.timeoutMs ?? 7000;
    let attempts = 0;

    if (!Number.isFinite(s.localResult)) {
      return { status: s.strict ? "blocked" : "ok", final: 0, tier: "local", attempts, agreeWithLocal: false, deltaAbs: NaN, deltaPct: NaN, reason: "Local non-finite." };
    }
    if (process.env.CALC_AI_DISABLE === "1") {
      return { status: "ok", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: true, deltaAbs: 0, deltaPct: 0, explanation: "AI verification disabled." };
    }

    const dbg = !!process.env.CALC_TRIAGE_DEBUG;

    // Tier 1 — OpenAI (concise, then verbose)
    if (hasOpenAI()) {
      for (const verbose of [false, true]) {
        attempts++;
        const prompt = mkPrompt(s, verbose);
        const r = await askOpenAIJson(prompt, timeoutMs);
        const n = r?.result;
        if (good(n)) {
          const { final, deltaAbs, deltaPct, pass } = evaluate(Number(n), s.localResult, precision, tolPct);
          if (dbg) console.log("[triage] OA", { name: s.name, verbose, inputs: s.inputs, local: s.localResult, ai: final, deltaAbs, deltaPct, pass });
          if (pass) return { status: "ok", final, tier: "openai", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: r?.explanation || "" };
          if (s.strict) return { status: "blocked", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: r?.explanation || "", reason: "OpenAI outside tolerance (strict)." };
          console.warn(`[triage] OpenAI mismatch ${s.name}: local=${s.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return { status: "ok", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: r?.explanation || "", reason: "OpenAI outside tolerance; using local." };
        }
      }
    }

    // Tier 2 — Groq
    if (hasGroq()) {
      for (const verbose of [false, true]) {
        attempts++;
        const prompt = mkPrompt(s, verbose);
        const r = await askGroqJson(prompt, timeoutMs);
        const n = r?.result;
        if (good(n)) {
          const { final, deltaAbs, deltaPct, pass } = evaluate(Number(n), s.localResult, precision, tolPct);
          if (dbg) console.log("[triage] GQ", { name: s.name, verbose, inputs: s.inputs, local: s.localResult, ai: final, deltaAbs, deltaPct, pass });
          if (s.strict) return { status: "blocked", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: pass, deltaAbs, deltaPct, explanation: r?.explanation || "", reason: "Strict mode requires OpenAI." };
          if (pass) return { status: "ok", final, tier: "groq", attempts, agreeWithLocal: true, deltaAbs, deltaPct, explanation: r?.explanation || "" };
          console.warn(`[triage] Groq mismatch ${s.name}: local=${s.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`);
          return { status: "ok", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: false, deltaAbs, deltaPct, explanation: r?.explanation || "", reason: "Groq outside tolerance; using local." };
        }
      }
    }

    // Tier 3 — Local
    return { status: s.strict ? "blocked" : "ok", final: Number(s.localResult.toFixed(precision)), tier: "local", attempts, agreeWithLocal: true, deltaAbs: 0, deltaPct: 0, explanation: "AI unavailable; using local.", reason: s.strict ? "Strict mode requires OpenAI." : undefined };
  } catch (e) {
    console.error("[triage] Fatal:", e);
    const p = s.precision ?? 2;
    return { status: "ok", final: Number(s.localResult.toFixed(p)), tier: "local", attempts: 0, agreeWithLocal: true, deltaAbs: 0, deltaPct: 0, reason: "Caught fatal error; returned local." };
  }
}

