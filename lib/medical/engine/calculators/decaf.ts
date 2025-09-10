/**
 * DECAF score for AECOPD mortality risk
 * Components (1 point each except Dyspnea 5b=2):
 *  D: Dyspnea eMRCD 5a ->1; 5b ->2; others ->0
 *  E: Eosinopenia <0.05×10^9/L ->1
 *  C: Consolidation on CXR ->1
 *  A: Acidaemia pH < 7.30 ->1
 *  F: Atrial Fibrillation (present) ->1
 * Risk: 0-1 low, 2 moderate, 3-6 high
 * Ref: Steer et al., Thorax 2012;67:970–6; BMJ Open Respir Res 2021.
 */
export interface DECAFInput {
  emrcd: 1|2|3|4|5; // extended mMRC category: 5a or 5b encoded via 'dyspnea_5b' flag
  dyspnea_5b?: boolean; // true for 5b (housebound), false/undefined for 5a
  eos_count_10e9_per_L?: number; // absolute eosinophil count
  consolidation?: boolean;
  arterial_pH?: number;
  atrial_fibrillation?: boolean;
}
export interface DECAFResult {
  dyspnea_points: number;
  eos_points: number;
  consolidation_points: number;
  acidaemia_points: number;
  af_points: number;
  total: number;
  risk_band: "low"|"moderate"|"high";
}
export function decafScore(i: DECAFInput): DECAFResult {
  let dyspnea_points = 0;
  if (i.emrcd === 5) dyspnea_points = i.dyspnea_5b ? 2 : 1;

  const eos_points = (typeof i.eos_count_10e9_per_L === "number" && i.eos_count_10e9_per_L < 0.05) ? 1 : 0;
  const consolidation_points = i.consolidation ? 1 : 0;
  const acidaemia_points = (typeof i.arterial_pH === "number" && i.arterial_pH < 7.30) ? 1 : 0;
  const af_points = i.atrial_fibrillation ? 1 : 0;

  const total = dyspnea_points + eos_points + consolidation_points + acidaemia_points + af_points;
  const risk_band = (total <= 1) ? "low" : (total === 2) ? "moderate" : "high";
  return { dyspnea_points, eos_points, consolidation_points, acidaemia_points, af_points, total, risk_band };
}
