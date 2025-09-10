// lib/medical/engine/calculators/ranson.ts
export type RansonEtiology = "non_gallstone" | "gallstone";
export interface RansonAdmissionInput {
  etiology: RansonEtiology;
  age_years?: number | null;
  wbc_k?: number | null; // x10^9/L
  glucose_mg_dl?: number | null;
  ast_u_l?: number | null;
  ldh_u_l?: number | null;
}
export interface Ranson48hInput {
  hct_drop_pct?: number | null; // % fall from baseline
  bun_increase_mg_dl?: number | null;
  calcium_mg_dl?: number | null;
  pao2_mmHg?: number | null;
  base_deficit_mEq_L?: number | null;
  fluid_sequestration_L?: number | null;
}
export interface RansonOutput { points: number; components: Record<string, number>; }

export function runRansonAdmission(i: RansonAdmissionInput): RansonOutput {
  const comp: Record<string, number> = {};
  const isGall = i.etiology === "gallstone";
  comp.age = (i.age_years ?? 0) > (isGall ? 70 : 55) ? 1 : 0;
  comp.wbc = (i.wbc_k ?? 0) > (isGall ? 18 : 16) ? 1 : 0;
  comp.glucose = (i.glucose_mg_dl ?? 0) > (isGall ? 220 : 200) ? 1 : 0;
  comp.ast = (i.ast_u_l ?? 0) > (isGall ? 250 : 250) ? 1 : 0;
  comp.ldh = (i.ldh_u_l ?? 0) > (isGall ? 400 : 350) ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}

export function runRanson48h(i: Ranson48hInput): RansonOutput {
  const comp: Record<string, number> = {};
  comp.hct = (i.hct_drop_pct ?? 0) > 10 ? 1 : 0;
  comp.bun = (i.bun_increase_mg_dl ?? -99) > 5 ? 1 : 0;
  comp.ca = (i.calcium_mg_dl ?? 99) < 8 ? 1 : 0;
  comp.pao2 = (i.pao2_mmHg ?? 99) < 60 ? 1 : 0;
  comp.base_def = (i.base_deficit_mEq_L ?? 0) > 4 ? 1 : 0;
  comp.fluids = (i.fluid_sequestration_L ?? 0) > 6 ? 1 : 0;
  const points = Object.values(comp).reduce((a,b)=>a+b,0);
  return { points, components: comp };
}
