
import { register } from "../registry";

export function runMAPCalc({ SBP, DBP }:{ SBP:number, DBP:number }){
  if ([SBP,DBP].some(v=>v==null || !isFinite(v as number))) return null;
  const map = DBP + (SBP-DBP)/3;
  return { MAP_mmHg: Number(map.toFixed(0)) };
}

export function runModifiedShockIndex({ HR, MAP }:{ HR:number, MAP:number }){
  if ([HR,MAP].some(v=>v==null || !isFinite(v as number) || v<=0)) return null;
  const msi = HR / MAP;
  return { modified_shock_index: Number(msi.toFixed(2)) };
}

export function runRatePressureProduct({ HR, SBP }:{ HR:number, SBP:number }){
  if ([HR,SBP].some(v=>v==null || !isFinite(v as number))) return null;
  return { rpp_bpm_mmHg: HR*SBP };
}

export function runPulsePressureBand({ SBP, DBP }:{ SBP:number, DBP:number }){
  if ([SBP,DBP].some(v=>v==null || !isFinite(v as number))) return null;
  const pp = SBP-DBP;
  let band = "normal";
  if (pp<30) band = "narrow";
  if (pp>60) band = "wide";
  return { pulse_pressure_mmHg: pp, band };
}

export function runSVFromLVOT({ lvot_d_cm, lvot_vti_cm }:{ lvot_d_cm:number, lvot_vti_cm:number }){
  if ([lvot_d_cm,lvot_vti_cm].some(v=>v==null || !isFinite(v as number))) return null;
  const area = Math.PI * Math.pow(lvot_d_cm/2,2);
  // area(cm^2) * VTI(cm) = cm^3 = mL. No extra factor.
  const sv_ml = area * lvot_vti_cm;
  return { stroke_volume_mL: Number(sv_ml.toFixed(1)) };
}

export function runCOFromSVHR({ stroke_volume_mL, HR }:{ stroke_volume_mL:number, HR:number }){
  if ([stroke_volume_mL,HR].some(v=>v==null || !isFinite(v as number))) return null;
  const co = stroke_volume_mL * HR / 1000; // L/min
  return { cardiac_output_L_min: Number(co.toFixed(2)) };
}

export function runCIFromCOBSA({ cardiac_output_L_min, BSA_m2 }:{ cardiac_output_L_min:number, BSA_m2:number }){
  if ([cardiac_output_L_min,BSA_m2].some(v=>v==null || !isFinite(v as number) || v<=0)) return null;
  const ci = cardiac_output_L_min / BSA_m2;
  return { cardiac_index_L_min_m2: Number(ci.toFixed(2)) };
}

export function runSVRDyn({ MAP, RAP_mmHg, CO_L_min }:{ MAP:number, RAP_mmHg:number, CO_L_min:number }){
  if ([MAP,RAP_mmHg,CO_L_min].some(v=>v==null || !isFinite(v as number) || CO_L_min<=0)) return null;
  const svr = 80 * (MAP - RAP_mmHg) / CO_L_min;
  return { SVR_dyn_s_cm5: Number(svr.toFixed(0)) };
}

export function runPVRDyn({ mPAP_mmHg, PCWP_mmHg, CO_L_min }:{ mPAP_mmHg:number, PCWP_mmHg:number, CO_L_min:number }){
  if ([mPAP_mmHg,PCWP_mmHg,CO_L_min].some(v=>v==null || !isFinite(v as number) || CO_L_min<=0)) return null;
  const pvr = 80 * (mPAP_mmHg - PCWP_mmHg) / CO_L_min;
  return { PVR_dyn_s_cm5: Number(pvr.toFixed(0)) };
}

register({ id:"map_calc", label:"Mean arterial pressure (MAP)", inputs:[{key:"SBP",unit:"mmHg",required:true},{key:"DBP",unit:"mmHg",required:true}], run: runMAPCalc as any });
register({ id:"modified_shock_index", label:"Modified shock index (HR/MAP)", inputs:[{key:"HR",unit:"bpm",required:true},{key:"MAP",unit:"mmHg",required:true}], run: runModifiedShockIndex as any });
register({ id:"rate_pressure_product", label:"Rate–pressure product", inputs:[{key:"HR",unit:"bpm",required:true},{key:"SBP",unit:"mmHg",required:true}], run: runRatePressureProduct as any });
register({ id:"pulse_pressure_band", label:"Pulse pressure band", inputs:[{key:"SBP",unit:"mmHg",required:true},{key:"DBP",unit:"mmHg",required:true}], run: runPulsePressureBand as any });
register({ id:"sv_from_lvot", label:"Stroke volume from LVOT", inputs:[{key:"lvot_d_cm",unit:"cm",required:true},{key:"lvot_vti_cm",unit:"cm",required:true}], run: runSVFromLVOT as any });
register({ id:"co_from_sv_hr", label:"Cardiac output from SV & HR", inputs:[{key:"stroke_volume_mL",required:true},{key:"HR",unit:"bpm",required:true}], run: runCOFromSVHR as any });
register({ id:"ci_from_co_bsa", label:"Cardiac index from CO & BSA", inputs:[{key:"cardiac_output_L_min",unit:"L/min",required:true},{key:"BSA_m2",unit:"m²",required:true}], run: runCIFromCOBSA as any });
register({ id:"svr_dyn", label:"Systemic vascular resistance (SVR)", inputs:[{key:"MAP",unit:"mmHg",required:true},{key:"RAP_mmHg",unit:"mmHg",required:true},{key:"CO_L_min",unit:"L/min",required:true}], run: runSVRDyn as any });
register({ id:"pvr_dyn", label:"Pulmonary vascular resistance (PVR)", inputs:[{key:"mPAP_mmHg",unit:"mmHg",required:true},{key:"PCWP_mmHg",unit:"mmHg",required:true},{key:"CO_L_min",unit:"L/min",required:true}], run: runPVRDyn as any });
