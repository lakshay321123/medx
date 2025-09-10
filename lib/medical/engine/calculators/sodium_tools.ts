
import { register } from "../registry";

export function runCorrectedNaHyperglycemia({ Na, glucose_mg_dL }: { Na:number, glucose_mg_dL:number }){
  if ([Na,glucose_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const corr = Na + 1.6 * ((glucose_mg_dL - 100)/100);
  return { corrected_Na_mEq_L: Number(corr.toFixed(1)) };
}

export function runSodiumDeficitToTarget({ weight_kg, Na, target_Na=135 }: { weight_kg:number, Na:number, target_Na?:number }){
  if ([weight_kg,Na,target_Na].some(v=>v==null || !isFinite(v as number))) return null;
  const TBW = 0.6 * weight_kg;
  const deficit = (target_Na - Na) * TBW;
  return { sodium_deficit_mEq: Number(deficit.toFixed(0)) };
}

register({ id:"corrected_sodium_hyperglycemia", label:"Corrected Na (hyperglycemia)", inputs:[{key:"Na",required:true},{key:"glucose_mg_dL",required:true}], run: runCorrectedNaHyperglycemia as any });
register({ id:"sodium_deficit_to_target", label:"Sodium deficit to target", inputs:[{key:"weight_kg",required:true},{key:"Na",required:true},{key:"target_Na"}], run: runSodiumDeficitToTarget as any });
