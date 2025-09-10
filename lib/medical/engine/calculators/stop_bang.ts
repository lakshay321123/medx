
// lib/medical/engine/calculators/stop_bang.ts

export interface STOPBangInput {
  snoring?: boolean | null;
  tired?: boolean | null;
  observed_apnea?: boolean | null;
  high_bp?: boolean | null;
  bmi_over_35?: boolean | null;
  age_over_50?: boolean | null;
  neck_circ_over_40cm?: boolean | null;
  male?: boolean | null;
}

export interface STOPBangOutput { points: number; risk_band: "low"|"intermediate"|"high"; }

export function runSTOPBang(i: STOPBangInput): STOPBangOutput {
  const bools = [i.snoring,i.tired,i.observed_apnea,i.high_bp,i.bmi_over_35,i.age_over_50,i.neck_circ_over_40cm,i.male];
  const pts = bools.reduce((a,b)=>a+(b?1:0),0);
  let band: "low"|"intermediate"|"high" = "low";
  if (pts >= 5) band = "high";
  else if (pts >= 3) band = "intermediate";
  return { points: pts, risk_band: band };
}
