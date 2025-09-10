// lib/medical/engine/calculators/curb65.ts
export interface CURB65Input {
  confusion?: boolean | null; // acute confusion
  urea_mmol_L?: number | null; // if provided, uses this
  bun_mg_dl?: number | null;  // alternative to compute urea (mmol/L = BUN/2.8)
  rr?: number | null; // respiratory rate
  sbp?: number | null;
  dbp?: number | null;
  age?: number | null;
}

export interface CURB65Output {
  points: number;
  risk_band: "low"|"moderate"|"high";
  components: Record<string, number>;
}

export function runCURB65(i: CURB65Input): CURB65Output {
  const comp: Record<string, number> = {};
  const urea_mmol = i.urea_mmol_L ?? (i.bun_mg_dl != null ? i.bun_mg_dl/2.8 : null);
  comp.confusion = i.confusion ? 1 : 0;
  comp.urea = (urea_mmol != null && urea_mmol > 7) ? 1 : 0;
  const rr = i.rr ?? 0; comp.rr = rr >= 30 ? 1 : 0;
  const lowbp = (i.sbp != null && i.sbp < 90) || (i.dbp != null && i.dbp <= 60);
  comp.bp = lowbp ? 1 : 0;
  comp.age = (i.age != null && i.age >= 65) ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  let band: "low"|"moderate"|"high" = "low";
  if (points >= 3) band = "high";
  else if (points === 2) band = "moderate";
  return { points, risk_band: band, components: comp };
}
