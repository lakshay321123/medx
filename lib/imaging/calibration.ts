export type DecisionTier = "YES" | "Likely" | "Inconclusive";

export interface CalibrationInput {
  confidenceRaw: number | null | undefined;
  qualityScore: number;
  hasLateral: boolean;
  viewCount?: number | null;
  redFlagCount?: number | null;
}

export interface CalibrationResult {
  confidence_calibrated: number | null;
  decision_tier: DecisionTier;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export function getDecisionThresholds(): [number, number] {
  const defYes = 0.85;
  const defLikely = 0.6;
  const envYes = Number.parseFloat(process.env.DECISION_THRESHOLD_YES ?? "");
  const envLikely = Number.parseFloat(process.env.DECISION_THRESHOLD_LIKELY ?? "");
  let YES = Number.isFinite(envYes) ? envYes : defYes;
  let LIKELY = Number.isFinite(envLikely) ? envLikely : defLikely;
  if (YES < LIKELY) {
    [YES, LIKELY] = [LIKELY, YES];
  }
  YES = clamp01(YES);
  LIKELY = clamp01(LIKELY);
  return [YES, LIKELY];
}

export function applyCalibration(input: CalibrationInput): CalibrationResult {
  const raw = typeof input.confidenceRaw === "number" ? clamp01(input.confidenceRaw) : null;
  if (raw === null) {
    return { confidence_calibrated: null, decision_tier: "Inconclusive" };
  }

  const qualityScore = clamp01(input.qualityScore);
  const viewCount = Math.max(0, Math.floor(input.viewCount ?? 0));
  const redFlagCount = Math.max(0, Math.floor(input.redFlagCount ?? 0));

  const qualityMultiplier = 0.7 + qualityScore * 0.3;
  const lateralAdjustment = input.hasLateral ? 0.02 : -0.08;
  const viewBonus = viewCount > 1 ? 0.03 : 0;
  const redFlagPenalty = redFlagCount > 0 ? -0.03 * Math.min(redFlagCount, 10) : 0;

  let confidence = raw * qualityMultiplier + lateralAdjustment + viewBonus + redFlagPenalty;
  confidence = clamp01(confidence);

  const [YES_THRESHOLD, LIKELY_THRESHOLD] = getDecisionThresholds();
  const decision_tier: DecisionTier =
    confidence >= YES_THRESHOLD ? "YES" : confidence >= LIKELY_THRESHOLD ? "Likely" : "Inconclusive";

  return { confidence_calibrated: confidence, decision_tier };
}

export const DECISION_THRESHOLDS = (() => {
  const [YES, LIKELY] = getDecisionThresholds();
  return { YES, LIKELY } as const;
})();
