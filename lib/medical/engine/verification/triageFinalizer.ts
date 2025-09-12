// lib/medical/engine/verification/triageFinalizer.ts
import { openaiText, groqChat } from "@/lib/llm";

type NumDict = Record<string, number | string | boolean | null>;

export interface CalcSpec {
  name: string;               // e.g., "anion_gap"
  formulaSpec: string;        // canonical formula with units
  inputs: NumDict;            // raw inputs
  localResult: number;        // deterministic TS result
  precision?: number;         // decimals to keep (default 2)
  tolerancePct?: number;      // % diff vs local allowed (default 1%)
  strict?: boolean;           // if true, block unless OpenAI passes tolerance
}

export interface CalcVerdict {
  status: "ok" | "blocked";   // blocked only in strict mode failures
  final: number;              // authoritative value the app should display
  tier: "openai" | "groq" | "local";
  attempts: number;           // total LLM attempts made
  agreeWithLocal: boolean;    // within tolerance of local result
  deltaAbs: number;           // |final - local|
  deltaPct: number;           // % difference vs local
  explanation?: string;       // brief step-by-step from LLM (when available)
  reason?: string;            // when blocked/fallback, explains why
}

const SYSTEM_PROMPT = [
  "You are a medical calculator.",
  "Recompute the given formula exactly and deterministically.",
  "Perform explicit arithmetic; no heuristics or ranges.",
  "Return JSON ONLY with keys: result (number), explanation (string)."
].join(" ");

function mkUserPrompt(spec: CalcSpec, verbose = false) {
  const precision = spec.precision ?? 2;
  return [
    `Formula: ${spec.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(spec.inputs)}`,
    `Local result: ${spec.localResult}`,
    `Required precision: ${precision} decimal places.`,
    verbose ? "Show each step digit-by-digit." : "Show concise steps.",
    `Return JSON ONLY: {"result": <number>, "explanation": "<string>"}`
  ].join("\n");
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") { const n = Number(x); if (Number.isFinite(n)) return n; }
  return null;
}

async function askOpenAI(prompt: string, model?: string) {
  try {
    const content = await openaiText(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      model || process.env.OPENAI_TEXT_MODEL || "gpt-5",
      0
    );
    return JSON.parse(typeof content === "string" ? content : String(content));
  } catch (err) {
    console.warn("[triageFinalizer] OpenAI error:", err);
    return null;
  }
}

async function askGroq(prompt: string, model?: string) {
  try {
    const content = await groqChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      model || process.env.LLM_MODEL_ID || "llama3-70b-8192",
      0
    );
    return JSON.parse(typeof content === "string" ? content : String(content));
  } catch (err) {
    console.warn("[triageFinalizer] Groq error:", err);
    return null;
  }
}

function evaluateAgainstLocal(finalNum: number, localResult: number, precision: number, tolerancePct: number) {
  const final = Number(finalNum.toFixed(precision));
  const deltaAbs = Math.abs(final - localResult);
  const denom = Math.max(1e-9, Math.abs(localResult));
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolerancePct;
  return { final, deltaAbs, deltaPct, pass };
}

/**
 * 3-tier finalizer for calculators:
 *  1) OpenAI authoritative if within tolerance
 *  2) Groq backup if OpenAI fails
 *  3) Local deterministic fallback
 * If strict=true: block output unless OpenAI passes tolerance.
 */
export async function finalizeCalc(spec: CalcSpec): Promise<CalcVerdict> {
  const precision = spec.precision ?? 2;
  const tolerancePct = spec.tolerancePct ?? 1; // 1% default
  let attempts = 0;

  // -------- Tier 1: OpenAI (two passes: concise then verbose) --------
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askOpenAI(mkUserPrompt(spec, verbose));
    const n = r && toNumber(r.result);
    if (n !== null) {
      const { final, deltaAbs, deltaPct, pass } =
        evaluateAgainstLocal(n, spec.localResult, precision, tolerancePct);

      if (pass) {
        return {
          status: "ok",
          final,
          tier: "openai",
          attempts,
          agreeWithLocal: true,
          deltaAbs,
          deltaPct,
          explanation: r.explanation || "",
        };
      }

      // OpenAI returned a number but it's outside tolerance
      if (spec.strict) {
        return {
          status: "blocked",
          final: Number(spec.localResult.toFixed(precision)),
          tier: "local",
          attempts,
          agreeWithLocal: false,
          deltaAbs,
          deltaPct,
          explanation: r.explanation || "",
          reason: "OpenAI result outside tolerance (strict mode).",
        };
      }

      // Non-strict: fall back to local for safety and log
      console.warn(
        `[triageFinalizer] OpenAI mismatch for ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`
      );
      return {
        status: "ok",
        final: Number(spec.localResult.toFixed(precision)),
        tier: "local",
        attempts,
        agreeWithLocal: false,
        deltaAbs,
        deltaPct,
        explanation: r.explanation || "",
        reason: "OpenAI outside tolerance; using local.",
      };
    }
  }

  // -------- Tier 2: Groq (two passes) --------
  for (const verbose of [false, true]) {
    attempts++;
    const r = await askGroq(mkUserPrompt(spec, verbose));
    const n = r && toNumber(r.result);
    if (n !== null) {
      const { final, deltaAbs, deltaPct, pass } =
        evaluateAgainstLocal(n, spec.localResult, precision, tolerancePct);

      // Groq never "authoritative" in strict mode; it's a backup to avoid blank UIs
      if (spec.strict) {
        return {
          status: "blocked",
          final: Number(spec.localResult.toFixed(precision)),
          tier: "local",
          attempts,
          agreeWithLocal: pass,
          deltaAbs,
          deltaPct,
          explanation: r.explanation || "",
          reason: "Strict mode requires OpenAI; Groq used as informational only.",
        };
      }

      // Non-strict: accept Groq if within tolerance; otherwise local
      if (pass) {
        return {
          status: "ok",
          final,
          tier: "groq",
          attempts,
          agreeWithLocal: true,
          deltaAbs,
          deltaPct,
          explanation: r.explanation || "",
        };
      }

      console.warn(
        `[triageFinalizer] Groq mismatch for ${spec.name}: local=${spec.localResult} ai=${final} Δ=${deltaAbs} (${deltaPct.toFixed(2)}%)`
      );
      return {
        status: "ok",
        final: Number(spec.localResult.toFixed(precision)),
        tier: "local",
        attempts,
        agreeWithLocal: false,
        deltaAbs,
        deltaPct,
        explanation: r.explanation || "",
        reason: "Groq outside tolerance; using local.",
      };
    }
  }

  // -------- Tier 3: Local deterministic fallback --------
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
