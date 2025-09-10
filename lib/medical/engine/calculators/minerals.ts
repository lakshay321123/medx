
import { register } from "../registry";

export function runCorrectedCalciumAlbumin({ calcium_mg_dL, albumin_g_dL }: { calcium_mg_dL:number, albumin_g_dL:number }){
  if ([calcium_mg_dL,albumin_g_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const corr = calcium_mg_dL + 0.8*(4 - albumin_g_dL);
  return { corrected_calcium_mg_dL: Number(corr.toFixed(2)) };
}

export function runCaXPhosProduct({ calcium_mg_dL, phosphate_mg_dL }: { calcium_mg_dL:number, phosphate_mg_dL:number }){
  if ([calcium_mg_dL,phosphate_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const prod = calcium_mg_dL * phosphate_mg_dL;
  return { ca_x_phos_mg2_dL2: Number(prod.toFixed(1)) };
}

register({ id:"corrected_calcium_albumin", label:"Corrected calcium (albumin)", inputs:[{key:"calcium_mg_dL",required:true},{key:"albumin_g_dL",required:true}], run: runCorrectedCalciumAlbumin as any });
register({ id:"calcium_phosphate_product", label:"Calcium × Phosphate product", inputs:[{key:"calcium_mg_dL",required:true},{key:"phosphate_mg_dL",required:true}], run: runCaXPhosProduct as any });
