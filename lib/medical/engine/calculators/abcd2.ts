// lib/medical/engine/calculators/abcd2.ts

export interface ABCD2Input {
  age_ge_60?: boolean | null;
  sbp_ge_140_or_dbp_ge_90?: boolean | null;
  clinical_unilateral_weakness?: boolean | null;
  clinical_speech_disturbance_without_weakness?: boolean | null;
  duration_min?: number | null;
  diabetes?: boolean | null;
}

export interface ABCD2Output { points: number; risk_band: "low"|"moderate"|"high"; components: Record<string, number>; }

export function runABCD2(i: ABCD2Input): ABCD2Output {
  const comp: Record<string, number> = {};
  comp.age = i.age_ge_60 ? 1 : 0;
  comp.bp = i.sbp_ge_140_or_dbp_ge_90 ? 1 : 0;
  comp.clinical = i.clinical_unilateral_weakness ? 2 : (i.clinical_speech_disturbance_without_weakness ? 1 : 0);
  const d = i.duration_min ?? 0;
  comp.duration = d >= 60 ? 2 : (d >= 10 ? 1 : 0);
  comp.dm = i.diabetes ? 1 : 0;
  const pts = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: "low"|"moderate"|"high" = "low";
  if (pts >= 6) band = "high";
  else if (pts >= 4) band = "moderate";
  return { points: pts, risk_band: band, components: comp };
}
