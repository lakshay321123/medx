
import { register } from "../registry";

export type SOFAInputs = {
  PaO2_mmHg?: number, FiO2?: number, SaO2_pct?: number,  // respiratory
  platelets_k_uL: number,                                  // coagulation
  bilirubin_mg_dL: number,                                 // liver
  map_mmHg?: number,                                       // cardiovascular (if no vaso)
  norepi_ug_kg_min?: number, epi_ug_kg_min?: number, dopa_ug_kg_min?: number, vasopressin_u_min?: number,
  gcs_total: number,                                       // cns
  creat_mg_dL: number, urine_mL_per_kg_h?: number         // renal
};

function respSub(i:SOFAInputs){
  if (i.PaO2_mmHg!=null && i.FiO2!=null){
    const pfr = i.PaO2_mmHg / i.FiO2;
    if (pfr<100) return 4;
    if (pfr<200) return 3;
    if (pfr<300) return 2;
    if (pfr<400) return 1;
    return 0;
  }
  // fallback SaO2/FiO2 (rough)
  if (i.SaO2_pct!=null && i.FiO2!=null){
    const sfr = i.SaO2_pct / i.FiO2;
    if (sfr<89) return 4;
    if (sfr<147) return 3;
    if (sfr<235) return 2;
    if (sfr<315) return 1;
  }
  return null;
}

function coagSub(plt:number){
  if (plt<20) return 4;
  if (plt<50) return 3;
  if (plt<100) return 2;
  if (plt<150) return 1;
  return 0;
}

function liverSub(bili:number){
  if (bili>=12) return 4;
  if (bili>=6) return 3;
  if (bili>=2) return 2;
  if (bili>=1.2) return 1;
  return 0;
}

function cardioSub(i:SOFAInputs){
  const n=i.norepi_ug_kg_min||0, e=i.epi_ug_kg_min||0, d=i.dopa_ug_kg_min||0, v=i.vasopressin_u_min||0;
  if (n>0.1 || e>0.1 || v>0) return 4;
  if ((n>0 && n<=0.1) || (e>0 && e<=0.1) || (d>=5 && d<=15)) return 3;
  if (d>15) return 4;
  if (i.map_mmHg!=null && i.map_mmHg<70) return 1;
  return 0;
}

function cnsSub(gcs:number){
  if (gcs<=6) return 4;
  if (gcs<=9) return 3;
  if (gcs<=12) return 2;
  if (gcs<=14) return 1;
  return 0;
}

function renalSub(creat:number, uop?:number){
  let s = 0;
  if (creat>=5.0) s=4;
  else if (creat>=3.5) s=3;
  else if (creat>=2.0) s=2;
  else if (creat>=1.2) s=1;
  if (uop!=null){
    if (uop<0.3) return Math.max(s,4);
    if (uop<0.5) return Math.max(s,3);
  }
  return s;
}

export function runSOFA(i:SOFAInputs){
  if ([i.platelets_k_uL,i.bilirubin_mg_dL,i.gcs_total,i.creat_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const subs = {
    resp: respSub(i),
    coag: coagSub(i.platelets_k_uL),
    liver: liverSub(i.bilirubin_mg_dL),
    cardio: cardioSub(i),
    cns: cnsSub(i.gcs_total),
    renal: renalSub(i.creat_mg_dL, i.urine_mL_per_kg_h)
  };
  if (subs.resp==null) return { needs:["PaO2_mmHg/FiO2 or SaO2/FiO2"] };
  const total = (subs.resp||0)+subs.coag+subs.liver+subs.cardio+subs.cns+subs.renal;
  return { SOFA_total: total, subscores: subs };
}

register({ id:"sofa_full", label:"SOFA (full)", inputs:[
  {key:"PaO2_mmHg"},{key:"FiO2"},{key:"SaO2_pct"},
  {key:"platelets_k_uL",required:true},
  {key:"bilirubin_mg_dL",required:true},
  {key:"map_mmHg"},
  {key:"norepi_ug_kg_min"},{key:"epi_ug_kg_min"},{key:"dopa_ug_kg_min"},{key:"vasopressin_u_min"},
  {key:"gcs_total",required:true},
  {key:"creat_mg_dL",required:true},{key:"urine_mL_per_kg_h"}
], run: runSOFA as any });
