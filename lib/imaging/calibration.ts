export type DecisionTier = "YES" | "Likely" | "Inconclusive";

export interface CalibrationInput {
  confidenceRaw: number | null | undefined;
  qualityScore: number;
  hasLateral: boolean;
  viewCount: number;
  redFlagCount?: number;
}

export interface CalibrationResult {
  confidence_calibrated: number | null;
  decision_tier: DecisionTier;
}

const YES_THRESHOLD = Number.parseFloat(process.env.DECISION_THRESHOLD_YES || "0.85");
const LIKELY_THRESHOLD = Number.parseFloat(process.env.DECISION_THRESHOLD_LIKELY || "0.6");

function clamp01(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function tierFromConfidence(confidence: number | null): DecisionTier {
  if (confidence === null) return "Inconclusive";
  if (confidence >= YES_THRESHOLD) return "YES";
  if (confidence >= LIKELY_THRESHOLD) return "Likely";
  return "Inconclusive";
}

export function applyCalibration(input: CalibrationInput): CalibrationResult {
  const raw = typeof input.confidenceRaw === "number" ? clamp01(input.confidenceRaw) : null;
  if (raw === null) {
    return { confidence_calibrated: null, decision_tier: "Inconclusive" };
  }

  const qualityMultiplier = 0.7 + input.qualityScore * 0.3;
  const lateralAdjustment = input.hasLateral ? 0.02 : -0.08;
  const viewBonus = input.viewCount > 1 ? 0.03 : 0;
  const redFlagPenalty = input.redFlagCount && input.redFlagCount > 0 ? -0.03 * input.redFlagCount : 0;

  let adjusted = raw * qualityMultiplier + lateralAdjustment + viewBonus + redFlagPenalty;
  adjusted = clamp01(adjusted);

  return {
    confidence_calibrated: adjusted,
    decision_tier: tierFromConfidence(adjusted),
  };
}

export const DECISION_THRESHOLDS = {
  YES: YES_THRESHOLD,
  LIKELY: LIKELY_THRESHOLD,
};
