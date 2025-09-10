// lib/medical/engine/calculators/murray_ards.ts
// Murray Lung Injury Score (LIS) uses four components (0–4 each): CXR quadrants, PaO2/FiO2, PEEP, Compliance.
// Final score = average of available components.

export interface MurrayInput {
  cxr_quadrants_involved?: number | null;   // 0–4
  pf_ratio?: number | null;                  // PaO2/FiO2
  peep_cmH2O?: number | null;
  compliance_mL_per_cmH2O?: number | null;   // static compliance
}

export interface MurrayOutput {
  component_points: {
    cxr: number | null;
    pf: number | null;
    peep: number | null;
    compliance: number | null;
  };
  lis: number;  // average of non-null components, 0–4
}

function bandPF(pf: number): number {
  if (pf >= 300) return 0;
  if (pf >= 225) return 1;
  if (pf >= 175) return 2;
  if (pf >= 100) return 3;
  return 4;
}

function bandPEEP(p: number): number {
  if (p <= 5) return 0;
  if (p <= 8) return 1;
  if (p <= 11) return 2;
  if (p <= 14) return 3;
  return 4;
}

function bandCompliance(c: number): number {
  if (c >= 80) return 0;
  if (c >= 60) return 1;
  if (c >= 40) return 2;
  if (c >= 20) return 3;
  return 4;
}

export function runMurrayLIS(i: MurrayInput): MurrayOutput {
  const cxr = (typeof i.cxr_quadrants_involved === "number")
    ? Math.max(0, Math.min(4, Math.floor(i.cxr_quadrants_involved))) : null;
  const pf = (typeof i.pf_ratio === "number") ? bandPF(i.pf_ratio) : null;
  const peep = (typeof i.peep_cmH2O === "number") ? bandPEEP(i.peep_cmH2O) : null;
  const comp = (typeof i.compliance_mL_per_cmH2O === "number") ? bandCompliance(i.compliance_mL_per_cmH2O) : null;

  const vals = [cxr, pf, peep, comp].filter(v => v !== null) as number[];
  const lis = vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100 : 0;

  return { component_points: { cxr, pf, peep, compliance: comp }, lis };
}
