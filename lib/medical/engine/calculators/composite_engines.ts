
import { register } from "../registry";

// DKA severity classification (ADA-ish bands)
export type DKAInputs = { pH: number, HCO3: number, mental_status?: "alert"|"drowsy"|"stupor/coma" };
export function runDKASeverity({ pH, HCO3, mental_status="alert" }: DKAInputs) {
  if ([pH,HCO3].some(v=>v==null || !isFinite(v as number))) return null;
  let severity: "mild"|"moderate"|"severe" = "mild";
  if (pH < 7.00 || HCO3 < 10 || mental_status==="stupor/coma") severity = "severe";
  else if (pH < 7.25 || HCO3 < 15 || mental_status==="drowsy") severity = "moderate";
  return { severity };
}

// Sepsis bundle flag (screen): hypotension (MAP<65 or SBP<90) or lactate >=4
export type SepsisInputs = { SBP?: number, MAP?: number, Lactate?: number };
export function runSepsisBundleFlag(i: SepsisInputs){
  const hypotension = (i.MAP!=null && i.MAP<65) || (i.SBP!=null && i.SBP<90);
  const highLactate = i.Lactate!=null && i.Lactate>=4;
  const bundle_flag = !!(hypotension || highLactate);
  return { bundle_flag, reasons: { hypotension: !!hypotension, lactate_ge_4: !!highLactate } };
}

// ARDS severity (Berlin) from PF ratio and support (assume PEEP>=5 if ventilated)
export type ARDSInputs = { PaO2: number, FiO2: number, ventilatory_support?: boolean, PEEP_cmH2O?: number };
export function runARDSSeverity({ PaO2, FiO2, ventilatory_support=false, PEEP_cmH2O }: ARDSInputs) {
  if ([PaO2,FiO2].some(v=>v==null || !isFinite(v as number))) return null;
  const PF = PaO2/FiO2;
  let severity: "none"|"mild"|"moderate"|"severe" = "none";
  const supported = ventilatory_support || (PEEP_cmH2O!=null && PEEP_cmH2O>=5);
  if (supported) {
    if (PF < 100) severity = "severe";
    else if (PF < 200) severity = "moderate";
    else if (PF <= 300) severity = "mild";
  }
  return { PF: Math.round(PF), severity };
}

// Shock Index bands (HR/SBP)
export type ShockInputs = { HR: number, SBP: number };
export function runShockIndexBands({ HR, SBP }: ShockInputs) {
  if ([HR,SBP].some(v=>v==null || !isFinite(v as number))) return null;
  if (HR<=0 || SBP<=0) return null;
  const value = HR/SBP;
  let band: "normal"|"elevated"|"critical" = "normal";
  if (value>=0.9 && value<1.3) band = "elevated";
  else if (value>=1.3) band = "critical";
  return { value: Number(value.toFixed(2)), band };
}

register({ id:"dka_severity", label:"DKA severity", inputs:[{key:"pH",required:true},{key:"HCO3",required:true},{key:"mental_status"}], run: runDKASeverity as any });
register({ id:"sepsis_bundle_flag", label:"Sepsis bundle flag", inputs:[{key:"SBP",unit:"mmHg"},{key:"MAP",unit:"mmHg"},{key:"Lactate",unit:"mmol/L"}], run: runSepsisBundleFlag as any });
register({ id:"ards_severity", label:"ARDS severity (Berlin)", inputs:[{key:"PaO2",required:true},{key:"FiO2",required:true},{key:"ventilatory_support"},{key:"PEEP_cmH2O"}], run: runARDSSeverity as any });
register({ id:"shock_index_bands", label:"Shock index bands", inputs:[{key:"HR",unit:"bpm",required:true},{key:"SBP",unit:"mmHg",required:true}], run: runShockIndexBands as any });
