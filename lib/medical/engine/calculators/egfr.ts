import { register } from "../registry";

export function runEGFR(i:{ method:"CKD_EPI_2021"|"MDRD"|"CockcroftGault", sex:"male"|"female", age_years:number, scr_mg_dL:number, weight_kg?:number }){
  if (i==null || i.age_years==null || !isFinite(i.age_years) || i.scr_mg_dL==null || !isFinite(i.scr_mg_dL)) return null;
  const sexFac = i.sex==="female";
  let e=null as number|null;
  if (i.method==="CKD_EPI_2021"){
    const k = sexFac?0.7:0.9;
    const a = sexFac?-0.241:-0.302;
    const min = Math.min(i.scr_mg_dL/k,1)**a;
    const max = Math.max(i.scr_mg_dL/k,1)**-1.200;
    e = 142*min*max*(0.9938**i.age_years)*(sexFac?1.012:1.0);
  } else if (i.method==="MDRD"){
    e = 175*(i.scr_mg_dL**-1.154)*(i.age_years**-0.203)*(sexFac?0.742:1.0);
  } else {
    if (i.weight_kg==null || !isFinite(i.weight_kg)) return { needs:["weight_kg"] };
    e = ((140 - i.age_years) * i.weight_kg) / (72 * i.scr_mg_dL) * (sexFac?0.85:1.0);
  }
  return { eGFR_mL_min_1_73m2: Number((e as number).toFixed(1)) };
}
register({ id:"egfr", label:"eGFR (CKD‑EPI 2021 / MDRD / Cockcroft‑Gault)", inputs:[
  {key:"method",required:true},{key:"sex",required:true},{key:"age_years",required:true},{key:"scr_mg_dL",required:true},{key:"weight_kg"}
], run: runEGFR as any });
