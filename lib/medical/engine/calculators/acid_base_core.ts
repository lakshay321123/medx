
import { register } from "../registry";

export type AGInputs = { Na: number, Cl: number, HCO3: number };
export function runAnionGap({ Na, Cl, HCO3 }: AGInputs) {
  if ([Na,Cl,HCO3].some(v=>v==null || !isFinite(v as number))) return null;
  const ag = Na - (Cl + HCO3);
  return { ag: Number(ag.toFixed(1)) };
}

export type AGAlbInputs = { AG: number, albumin_g_dL: number };
export function runAnionGapAlbuminCorrected({ AG, albumin_g_dL }: AGAlbInputs) {
  if ([AG,albumin_g_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const corr = AG + 2.5 * (4.0 - albumin_g_dL);
  return { ag_corrected: Number(corr.toFixed(1)) };
}

export type WintersInputs = { HCO3: number };
export function runWintersExpectedPaCO2({ HCO3 }: WintersInputs) {
  if (HCO3==null || !isFinite(HCO3)) return null;
  const exp = 1.5*HCO3 + 8;
  return { expected_PaCO2_mmHg: Number(exp.toFixed(0)), range_mmHg: [Number((exp-2).toFixed(0)), Number((exp+2).toFixed(0))] };
}

export type DeltaGapInputs = { AG: number, HCO3: number };
export function runDeltaGap({ AG, HCO3 }: DeltaGapInputs) {
  if ([AG,HCO3].some(v=>v==null || !isFinite(v as number))) return null;
  const delta = (AG - 12) - (24 - HCO3);
  return { delta_gap: Number(delta.toFixed(1)) };
}

export function runDeltaRatio({ AG, HCO3 }: DeltaGapInputs) {
  if ([AG,HCO3].some(v=>v==null || !isFinite(v as number))) return null;
  const num = (AG - 12);
  const den = (24 - HCO3);
  if (den===0) return { delta_ratio: null, note: "ΔHCO3 is 0" };
  const ratio = num/den;
  return { delta_ratio: Number(ratio.toFixed(2)) };
}

export type BicarbDefInputs = { weight_kg: number, HCO3: number, target_HCO3?: number };
export function runBicarbonateDeficit({ weight_kg, HCO3, target_HCO3=24 }: BicarbDefInputs) {
  if ([weight_kg,HCO3,target_HCO3].some(v=>v==null || !isFinite(v as number))) return null;
  const TBW = 0.6 * weight_kg; // adult default
  const deficit = (target_HCO3 - HCO3) * TBW;
  return { bicarbonate_deficit_mEq: Number(deficit.toFixed(0)) };
}

register({ id:"anion_gap", label:"Anion gap", inputs:[{key:"Na",required:true},{key:"Cl",required:true},{key:"HCO3",required:true}], run: runAnionGap as any });
register({ id:"anion_gap_albumin_corrected", label:"Anion gap (albumin-corrected)", inputs:[{key:"AG",required:true},{key:"albumin_g_dL",required:true}], run: runAnionGapAlbuminCorrected as any });
register({ id:"winters_expected_paco2", label:"Winter's expected PaCO₂", inputs:[{key:"HCO3",required:true}], run: runWintersExpectedPaCO2 as any });
register({ id:"delta_gap", label:"Delta gap (AG−12) − (24−HCO3)", inputs:[{key:"AG",required:true},{key:"HCO3",required:true}], run: runDeltaGap as any });
register({ id:"delta_ratio", label:"Delta ratio (ΔAG/ΔHCO₃)", inputs:[{key:"AG",required:true},{key:"HCO3",required:true}], run: runDeltaRatio as any });
register({ id:"bicarbonate_deficit", label:"Bicarbonate deficit (approx)", inputs:[{key:"weight_kg",required:true},{key:"HCO3",required:true},{key:"target_HCO3"}], run: runBicarbonateDeficit as any });
