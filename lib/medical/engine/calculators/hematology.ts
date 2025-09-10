
import { register } from "../registry";

export function runANC({ WBC_k_uL, neutrophil_pct, bands_pct=0 }:{ WBC_k_uL:number, neutrophil_pct:number, bands_pct?:number }){
  if ([WBC_k_uL,neutrophil_pct,bands_pct].some(v=>v==null || !isFinite(v as number))) return null;
  const anc = WBC_k_uL * (neutrophil_pct + bands_pct)/100;
  return { ANC_k_uL: Number(anc.toFixed(2)) };
}

export function runReticCorrected({ retic_pct, Hct_frac, ref_Hct_frac=0.45 }:{ retic_pct:number, Hct_frac:number, ref_Hct_frac?:number }){
  if ([retic_pct,Hct_frac,ref_Hct_frac].some(v=>v==null || !isFinite(v as number) || ref_Hct_frac<=0)) return null;
  const corr = retic_pct * (Hct_frac/ref_Hct_frac);
  return { retic_corrected_pct: Number(corr.toFixed(2)) };
}

export function runRPI({ retic_corrected_pct, maturation_factor }:{ retic_corrected_pct:number, maturation_factor:number }){
  if ([retic_corrected_pct,maturation_factor].some(v=>v==null || !isFinite(v as number) || maturation_factor<=0)) return null;
  const rpi = retic_corrected_pct / maturation_factor;
  return { RPI: Number(rpi.toFixed(2)) };
}

register({ id:"anc_calc", label:"Absolute neutrophil count (ANC)", inputs:[{key:"WBC_k_uL",required:true},{key:"neutrophil_pct",required:true},{key:"bands_pct"}], run: runANC as any });
register({ id:"retic_corrected", label:"Corrected reticulocyte %", inputs:[{key:"retic_pct",required:true},{key:"Hct_frac",required:true},{key:"ref_Hct_frac"}], run: runReticCorrected as any });
register({ id:"retic_production_index", label:"Reticulocyte production index (RPI)", inputs:[{key:"retic_corrected_pct",required:true},{key:"maturation_factor",required:true}], run: runRPI as any });
