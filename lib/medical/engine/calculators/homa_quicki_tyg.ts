import { register } from "../registry";

export type FastingInputs = { Glucose_mg_dL: number, Insulin_uU_mL?: number, Triglycerides_mg_dL?: number };

export function runHOMA_IR({Glucose_mg_dL, Insulin_uU_mL}: FastingInputs) {
  if (Glucose_mg_dL==null || Insulin_uU_mL==null) return null;
  if (!isFinite(Glucose_mg_dL) || !isFinite(Insulin_uU_mL) || Glucose_mg_dL<=0 || Insulin_uU_mL<=0) return null;
  const value = Number(((Glucose_mg_dL * Insulin_uU_mL) / 405).toFixed(2));
  return { value };
}

// Approximate HOMA-B (mg/dL version): 360 * insulin / (glucose - 63)
export function runHOMA_B({Glucose_mg_dL, Insulin_uU_mL}: FastingInputs) {
  if (Glucose_mg_dL==null || Insulin_uU_mL==null) return null;
  const denom = (Glucose_mg_dL - 63);
  if (!isFinite(denom) || denom<=0) return null;
  const value = Number(((360 * Insulin_uU_mL) / denom).toFixed(1));
  return { value, unit: "%" };
}

export function runQUICKI({Glucose_mg_dL, Insulin_uU_mL}: FastingInputs) {
  if (Glucose_mg_dL==null || Insulin_uU_mL==null) return null;
  const value = 1 / (Math.log10(Insulin_uU_mL) + Math.log10(Glucose_mg_dL));
  return { value: Number(value.toFixed(3)) };
}

// TyG index (natural log of [TG (mg/dL) * Glucose (mg/dL) / 2])
export function runTyG({Glucose_mg_dL, Triglycerides_mg_dL}: FastingInputs) {
  if (Glucose_mg_dL==null || Triglycerides_mg_dL==null) return null;
  const value = Math.log((Triglycerides_mg_dL * Glucose_mg_dL) / 2);
  return { value: Number(value.toFixed(3)) };
}

register({ id:"homa_ir", label:"HOMA-IR", inputs:[{key:"Glucose_mg_dL",required:true},{key:"Insulin_uU_mL",required:true}], run: runHOMA_IR as any });
register({ id:"homa_b", label:"HOMA-B (approx %)", inputs:[{key:"Glucose_mg_dL",required:true},{key:"Insulin_uU_mL",required:true}], run: runHOMA_B as any });
register({ id:"quicki", label:"QUICKI", inputs:[{key:"Glucose_mg_dL",required:true},{key:"Insulin_uU_mL",required:true}], run: runQUICKI as any });
register({ id:"tyg_index", label:"TyG Index", inputs:[{key:"Glucose_mg_dL",required:true},{key:"Triglycerides_mg_dL",required:true}], run: runTyG as any });
