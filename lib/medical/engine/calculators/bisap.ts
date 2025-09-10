// lib/medical/engine/calculators/bisap.ts
export interface BISAPInput {
  bun_mg_dl?: number | null;
  gcs?: number | null; // 3-15
  sirs_count?: number | null; // 0-4
  age?: number | null;
  pleural_effusion?: boolean | null;
}
export interface BISAPOutput { points: number; components: Record<string, number>; risk_band: "low"|"moderate"|"high"; }

export function runBISAP(i: BISAPInput): BISAPOutput {
  const comp: Record<string, number> = {};
  comp.bun = (i.bun_mg_dl != null && i.bun_mg_dl > 25) ? 1 : 0;
  comp.gcs = (i.gcs != null && i.gcs < 15) ? 1 : 0;
  comp.sirs = (i.sirs_count != null && i.sirs_count >= 2) ? 1 : 0;
  comp.age = (i.age != null && i.age > 60) ? 1 : 0;
  comp.pleural = i.pleural_effusion ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: "low"|"moderate"|"high" = "low";
  if (points >= 3) band = "high";
  else if (points === 2) band = "moderate";
  return { points, components: comp, risk_band: band };
}
