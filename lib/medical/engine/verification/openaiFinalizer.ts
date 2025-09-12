import { openaiText } from "../../../llm";

type NumericDict = Record<string, number | string | boolean | null>;

export interface FinalizeRequest {
  calculator: string;                 // e.g., "anion_gap"
  formulaSpec: string;                // canonical formula string (see below)
  inputs: NumericDict;                // raw inputs used by TS calculator
  localResult: number;                // TS calculator output
  units?: string;                     // optional
  precision?: number;                 // decimals preferred (default 2)
  tolerancePct?: number;              // acceptable diff vs local (default 1%)
}

export interface FinalizeResponse {
  final: number;                      // OpenAI-computed result (authoritative)
  explanation?: string;               // brief step-by-step from OpenAI
  agreeWithLocal: boolean;
  deltaAbs: number;
  deltaPct: number;
  pass: boolean;                      // true if within tolerance
  attempts: number;                   // 1 or 2 passes
}

const SYSTEM = [
  "You are a medical math verifier.",
  "Recompute the given formula strictly and deterministically.",
  "Do explicit step-by-step arithmetic. No heuristics. No ranges.",
  "Return JSON ONLY with keys: result (number), explanation (string).",
].join(" ");

function buildUserPrompt(req: FinalizeRequest, forceVerboseSteps = false) {
  const precision = req.precision ?? 2;
  const guard = forceVerboseSteps
    ? "Do digit-by-digit arithmetic and show each operation explicitly."
    : "Show concise steps.";
  return [
    `Formula: ${req.formulaSpec}`,
    `Inputs (JSON): ${JSON.stringify(req.inputs)}`,
    `Local result: ${req.localResult}`,
    `Required precision: ${precision} decimal places.`,
    `${guard}`,
    `Return JSON ONLY: {"result": <number>, "explanation": "<string>"}`,
  ].join("\n");
}

function toNumber(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function finalizeWithOpenAI(req: FinalizeRequest): Promise<FinalizeResponse> {
  const tolerancePct = req.tolerancePct ?? 1; // 1%
  const precision = req.precision ?? 2;

  // Pass 1
  let attempts = 1;
  let aiResult = await askOpenAI(buildUserPrompt(req, false));
  let finalNum = toNumber(aiResult.result);

  if (finalNum === null) {
    // Force a structured redo
    attempts = 2;
    aiResult = await askOpenAI(buildUserPrompt(req, true));
    finalNum = toNumber(aiResult.result);
  }

  if (finalNum === null) {
    // If still invalid, fall back to local but mark as disagree
    const deltaAbs = NaN;
    const deltaPct = NaN;
    return {
      final: Number(req.localResult.toFixed(precision)),
      explanation: "OpenAI returned invalid result twice; using local result.",
      agreeWithLocal: false,
      deltaAbs,
      deltaPct,
      pass: false,
      attempts,
    };
  }

  const finalRounded = Number(finalNum.toFixed(precision));
  const deltaAbs = Math.abs(finalRounded - req.localResult);
  const denom = Math.max(1e-9, Math.abs(req.localResult));
  const deltaPct = (deltaAbs / denom) * 100;
  const pass = deltaPct <= tolerancePct;

  // Always accept OpenAI as the authoritative final
  return {
    final: finalRounded,
    explanation: aiResult.explanation ?? "",
    agreeWithLocal: pass,
    deltaAbs,
    deltaPct,
    pass,
    attempts,
  };
}

async function askOpenAI(user: string): Promise<{ result: unknown; explanation?: string }> {
  // Uses your existing openaiText wrapper. If you prefer the Responses API, swap here.
  const content = await openaiText({
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    response_format: { type: "json_object" }, // OpenAI JSON mode
    temperature: 0,
    max_tokens: 400,
    model: process.env.OPENAI_TEXT_MODEL || "gpt-5",
  });

  // content should be a JSON string
  try {
    const parsed = JSON.parse(typeof content === "string" ? content : `${content}`);
    return {
      result: parsed.result,
      explanation: parsed.explanation,
    };
  } catch {
    return { result: null, explanation: "Parse error" };
  }
}

