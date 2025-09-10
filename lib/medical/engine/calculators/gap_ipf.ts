
/**
 * GAP Index for IPF staging (Gender, Age, Physiology).
 * Table (Ley et al. 2012):
 * - Gender: Female 0, Male 1
 * - Age: <=60 = 0, 61–65 = 1, >65 = 2
 * - FVC % predicted: >75 = 0, 50–75 = 1, <50 = 2
 * - DLCO % predicted: >55 = 0, 36–55 =1, <=35 = 2; 'cannot perform' = 3
 * Stage: I (0–3), II (4–5), III (6–8)
 */
export type GAPInputs = {
  sex: "male" | "female";
  age_years: number;
  fvc_percent_pred: number;
  dlco_percent_pred?: number | null;
  dlco_cannot_perform?: boolean;
};

function ptsSex(sex: "male" | "female") { return sex === "male" ? 1 : 0; }
function ptsAge(age: number) {
  if (age <= 60) return 0;
  if (age <= 65) return 1;
  return 2;
}
function ptsFVC(p: number) {
  if (p > 75) return 0;
  if (p >= 50) return 1;
  return 2;
}
function ptsDLCO(p?: number | null, cannot?: boolean) {
  if (cannot) return 3;
  const v = typeof p === "number" ? p : NaN;
  if (!Number.isFinite(v)) return 0;
  if (v > 55) return 0;
  if (v >= 36) return 1;
  return 2;
}

export function runGAP(i: GAPInputs) {
  const score = ptsSex(i.sex) + ptsAge(i.age_years) + ptsFVC(i.fvc_percent_pred) + ptsDLCO(i.dlco_percent_pred ?? undefined, i.dlco_cannot_perform);
  const stage = score <= 3 ? "I" : score <= 5 ? "II" : "III";
  return { GAP_points: score, GAP_stage: stage };
}
