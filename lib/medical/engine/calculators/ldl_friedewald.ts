/**
 * LDL cholesterol (Friedewald) in mg/dL
 * LDL = Total Cholesterol - HDL - Triglycerides/5
 * Valid only when triglycerides < 400 mg/dL
 */
export interface LDLInput { total_chol_mg_dl: number; hdl_mg_dl: number; trig_mg_dl: number; }
export interface LDLResult { ldl_mg_dl: number | null; valid: boolean; }
export function runLDL_Friedewald(i: LDLInput): LDLResult {
  const valid = i.trig_mg_dl < 400;
  const ldl = valid ? (i.total_chol_mg_dl - i.hdl_mg_dl - i.trig_mg_dl/5) : null;
  return { ldl_mg_dl: ldl, valid };
}
