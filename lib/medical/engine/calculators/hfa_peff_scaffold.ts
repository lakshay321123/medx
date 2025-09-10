import { register } from "../registry";

/**
 * HFA‑PEFF (scaffold): expects pre‑aggregated domain points (0/1/2) for Morphology, Function, Biomarkers.
 * Returns total and interpretation per consensus.
 */
export function runHFAPEFF(i:{ morphology_pts:0|1|2, function_pts:0|1|2, biomarkers_pts:0|1|2 }){
  if (i==null) return null;
  const total = i.morphology_pts + i.function_pts + i.biomarkers_pts;
  let band = "low (≤1)"; if (total>=5) band="high (≥5)"; else if (total>=2) band="intermediate (2–4)";
  return { HFA_PEFF_total: total, band, note:"Provide domain adjudication upstream to avoid misclassification." };
}
register({ id:"hfa_peff_scaffold", label:"HFA‑PEFF (scaffold)", inputs:[
  {key:"morphology_pts",required:true},{key:"function_pts",required:true},{key:"biomarkers_pts",required:true}
], run: runHFAPEFF as any });
