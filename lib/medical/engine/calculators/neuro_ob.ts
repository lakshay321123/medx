
import { register } from "../registry";

export function runGCSTotalBand({ E, V, M }:{ E:number, V:number, M:number }){
  if ([E,V,M].some(v=>v==null || !isFinite(v as number))) return null;
  const total = E+V+M;
  let band = "severe"; if (total>=13) band="mild"; else if (total>=9) band="moderate";
  return { GCS_total: total, band };
}

export function runGestationalAgeFromLMP({ lmp_iso, today_iso }:{ lmp_iso:string, today_iso?:string }){
  try{
    const l = new Date(lmp_iso); const t = new Date(today_iso || new Date().toISOString().slice(0,10));
    const ms = t.getTime() - l.getTime();
    if (notFinite(ms)) return null;
    function notFinite(x:any){ return !isFinite(x as number); }
    const days = Math.floor(ms/86400000);
    const weeks = Math.floor(days/7);
    const d = days - weeks*7;
    return { gestational_weeks: weeks, gestational_days: d, label: `${weeks}w ${d}d` };
  }catch{ return null; }
}

export function runGDM75gFlag({ fasting_mg_dL, one_hr_mg_dL, two_hr_mg_dL }:{ fasting_mg_dL:number, one_hr_mg_dL:number, two_hr_mg_dL:number }){
  if ([fasting_mg_dL,one_hr_mg_dL,two_hr_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const meets = (fasting_mg_dL>=92) || (one_hr_mg_dL>=180) || (two_hr_mg_dL>=153);
  return { gdm_flag: meets };
}

register({ id:"gcs_total_band", label:"GCS total & band", inputs:[{key:"E",required:true},{key:"V",required:true},{key:"M",required:true}], run: runGCSTotalBand as any });
register({ id:"gestational_age_from_lmp", label:"Gestational age (from LMP)", inputs:[{key:"lmp_iso",required:true},{key:"today_iso"}], run: runGestationalAgeFromLMP as any });
register({ id:"gdm_75g_flag", label:"Gestational diabetes flag (75g OGTT)", inputs:[{key:"fasting_mg_dL",required:true},{key:"one_hr_mg_dL",required:true},{key:"two_hr_mg_dL",required:true}], run: runGDM75gFlag as any });
