import { register } from "../registry";

export type MetSynInputs = {
  Waist_cm?: number, Sex?: "M"|"F",
  Triglycerides_mg_dL?: number,
  HDL_mg_dL?: number,
  SBP?: number, DBP?: number, On_BP_Tx?: boolean,
  FastingGlucose_mg_dL?: number, Diabetes?: boolean
};

export function runMetabolicSyndrome(i: MetSynInputs) {
  const flags: string[] = [];
  // Waist thresholds (ATP III; adjust for ethnicity if you localize later)
  if (i.Waist_cm!=null && i.Sex) {
    const thr = i.Sex==="M" ? 102 : 88;
    if (i.Waist_cm >= thr) flags.push("central obesity");
  }
  if (i.Triglycerides_mg_dL!=null && i.Triglycerides_mg_dL >= 150) flags.push("hypertriglyceridemia");
  if (i.HDL_mg_dL!=null) {
    const thr = i.Sex==="M" ? 40 : 50;
    if (i.HDL_mg_dL < thr) flags.push("low HDL");
  }
  const bpHigh = (i.SBP!=null && i.SBP>=130) || (i.DBP!=null && i.DBP>=85) || i.On_BP_Tx===true;
  if (bpHigh) flags.push("elevated BP/Tx");
  const gluHigh = (i.FastingGlucose_mg_dL!=null && i.FastingGlucose_mg_dL>=100) || i.Diabetes===true;
  if (gluHigh) flags.push("impaired fasting glucose/DM");
  const count = flags.length;
  const hasMetSyn = count >= 3;
  return { components: flags, count, metabolic_syndrome: hasMetSyn };
}

register({
  id: "metabolic_syndrome_gate",
  label: "Metabolic Syndrome (ATP III gate)",
  inputs: [{key:"Waist_cm"},{key:"Sex"},{key:"Triglycerides_mg_dL"},{key:"HDL_mg_dL"},{key:"SBP"},{key:"DBP"},{key:"On_BP_Tx"},{key:"FastingGlucose_mg_dL"},{key:"Diabetes"}],
  run: runMetabolicSyndrome as any,
});
