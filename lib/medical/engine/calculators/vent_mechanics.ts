
import { register } from "../registry";

export function runFiO2FromNasalCannula({ flow_L_min }:{ flow_L_min:number }){
  if (flow_L_min==null || !isFinite(flow_L_min)) return null;
  // Approximate: 1L=24%, 2L=28%, 3L=32%, 4L=36%, 5L=40%, 6L=44%
  const map: Record<number, number> = {1:0.24,2:0.28,3:0.32,4:0.36,5:0.40,6:0.44};
  const rounded = Math.max(1, Math.min(6, Math.round(flow_L_min)));
  return { FiO2: map[rounded], note: "approximation" };
}

export function runMinuteVentilation({ tidal_volume_mL, RR }:{ tidal_volume_mL:number, RR:number }){
  if ([tidal_volume_mL,RR].some(v=>v==null || !isFinite(v as number))) return null;
  return { VE_L_min: Number((tidal_volume_mL * RR / 1000).toFixed(2)) };
}

export function runStaticCompliance({ tidal_volume_mL, plateau_cmH2O, PEEP_cmH2O }:{ tidal_volume_mL:number, plateau_cmH2O:number, PEEP_cmH2O:number }){
  if ([tidal_volume_mL,plateau_cmH2O,PEEP_cmH2O].some(v=>v==null || !isFinite(v as number))) return null;
  const c = tidal_volume_mL / (plateau_cmH2O - PEEP_cmH2O);
  return { Cstat_mL_cmH2O: Number(c.toFixed(1)) };
}

export function runDynamicCompliance({ tidal_volume_mL, peak_cmH2O, PEEP_cmH2O }:{ tidal_volume_mL:number, peak_cmH2O:number, PEEP_cmH2O:number }){
  if ([tidal_volume_mL,peak_cmH2O,PEEP_cmH2O].some(v=>v==null || !isFinite(v as number))) return null;
  const c = tidal_volume_mL / (peak_cmH2O - PEEP_cmH2O);
  return { Cdyn_mL_cmH2O: Number(c.toFixed(1)) };
}

export function runVentilatoryRatio({ VE_measured_L_min, PaCO2_mmHg, VE_pred_L_min }:{ VE_measured_L_min:number, PaCO2_mmHg:number, VE_pred_L_min:number }){
  if ([VE_measured_L_min,PaCO2_mmHg,VE_pred_L_min].some(v=>v==null || !isFinite(v as number) || VE_pred_L_min<=0)) return null;
  const vr = (VE_measured_L_min * PaCO2_mmHg) / (VE_pred_L_min * 40);
  return { ventilatory_ratio: Number(vr.toFixed(2)) };
}

register({ id:"fio2_from_nasal_cannula", label:"FiO₂ estimate (nasal cannula)", inputs:[{key:"flow_L_min",required:true}], run: runFiO2FromNasalCannula as any });
register({ id:"minute_ventilation", label:"Minute ventilation", inputs:[{key:"tidal_volume_mL",required:true},{key:"RR",required:true}], run: runMinuteVentilation as any });
register({ id:"static_compliance", label:"Static compliance (Cstat)", inputs:[{key:"tidal_volume_mL",required:true},{key:"plateau_cmH2O",required:true},{key:"PEEP_cmH2O",required:true}], run: runStaticCompliance as any });
register({ id:"dynamic_compliance", label:"Dynamic compliance (Cdyn)", inputs:[{key:"tidal_volume_mL",required:true},{key:"peak_cmH2O",required:true},{key:"PEEP_cmH2O",required:true}], run: runDynamicCompliance as any });
register({ id:"ventilatory_ratio", label:"Ventilatory ratio", inputs:[{key:"VE_measured_L_min",required:true},{key:"PaCO2_mmHg",required:true},{key:"VE_pred_L_min",required:true}], run: runVentilatoryRatio as any });
