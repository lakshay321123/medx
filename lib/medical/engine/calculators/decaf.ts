// lib/medical/engine/calculators/decaf.ts
// DECAF for AECOPD mortality risk: Dyspnea eMRCD grade, Eosinopenia, Consolidation, Acidaemia, Atrial fibrillation.

export interface DECAFInput {
  emrcd_grade?: 1|2|3|4|5; // use 5 for 5a or 5b, provide five_b flag below
  emrcd_five_b?: boolean | null;
  eos_abs_x10e9_L?: number | null;   // absolute eosinophils in 10^9 per L
  consolidation_on_cxr?: boolean | null;
  arterial_pH?: number | null;
  atrial_fibrillation?: boolean | null;
}

export interface DECAFOutput {
  points: number; // 0 to 6
  components: { dyspnea: number; eosinopenia: number; consolidation: number; acidaemia: number; af: number };
}

export function runDECAF(i: DECAFInput): DECAFOutput {
  let dysp = 0;
  if (i.emrcd_grade === 5) {
    dysp = i.emrcd_five_b ? 2 : 1;
  } else {
    dysp = 0;
  }
  const eosinopenia = (i.eos_abs_x10e9_L ?? Infinity) < 0.05 ? 1 : 0;
  const consolidation = i.consolidation_on_cxr ? 1 : 0;
  const acidaemia = (i.arterial_pH ?? Infinity) < 7.30 ? 1 : 0;
  const af = i.atrial_fibrillation ? 1 : 0;

  const total = dysp + eosinopenia + consolidation + acidaemia + af;
  return { points: total, components: { dyspnea: dysp, eosinopenia, consolidation, acidaemia, af } };
}
