
import { register } from "../registry";

export type RenalFlagInputs = { eGFR: number };
export function runRenalDosingFlag({ eGFR }: RenalFlagInputs) {
  if (eGFR==null || !isFinite(eGFR)) return null;
  const flag = eGFR < 15 ? "contraindicated/avoid" : eGFR < 30 ? "reduce dose/extend interval" : eGFR < 60 ? "consider adjustment" : "no renal adjustment";
  return { flag };
}

export type HepaticFlagInputs = { child_pugh?: "A"|"B"|"C", bilirubin_mg_dL?: number, albumin_g_dL?: number, INR?: number, ascites?: "none"|"mild"|"moderate-severe", encephalopathy?: "none"|"grade I-II"|"grade III-IV" };
export function runHepaticDosingFlag(i: HepaticFlagInputs) {
  let cls = i.child_pugh;
  if (!cls && i.bilirubin_mg_dL!=null && i.albumin_g_dL!=null && i.INR!=null && i.ascites && i.encephalopathy) {
    // Simplified Child-Pugh estimation
    const b = i.bilirubin_mg_dL, a = i.albumin_g_dL, inr = i.INR;
    let score = 0;
    score += (b<2)?1 : (b<=3)?2 : 3;
    score += (a>3.5)?1 : (a>=2.8)?2 : 3;
    score += (inr<1.7)?1 : (inr<=2.3)?2 : 3;
    score += (i.ascites==="none")?1 : (i.ascites==="mild")?2 : 3;
    score += (i.encephalopathy==="none")?1 : (i.encephalopathy==="grade I-II")?2 : 3;
    cls = score<=6 ? "A" : score<=9 ? "B" : "C";
  }
  const flag = cls==="C" ? "avoid/contraindicated" : cls==="B" ? "dose reduction/caution" : cls==="A" ? "use with caution" : "insufficient data";
  return { child_pugh: cls, flag };
}

// Drug level bands
export type DrugLevel = { drug: "digoxin"|"lithium"|"gentamicin"|"tobramycin"|"amikacin", level: number, sample?: "trough"|"peak" };
export function runDrugLevelBand({ drug, level, sample="trough" }: DrugLevel) {
  if (level==null || !isFinite(level)) return null;
  let band = "unknown";
  if (drug==="digoxin") {
    band = level<0.5 ? "subtherapeutic" : level<=0.9 ? "therapeutic (HF 0.5–0.9)" : level<=2.0 ? "upper/AF range (monitor)" : "toxic";
  } else if (drug==="lithium") {
    band = level<0.6 ? "subtherapeutic" : level<=1.2 ? "therapeutic" : level<1.5 ? "high (monitor)" : "toxic";
  } else if (drug==="gentamicin" || drug==="tobramycin") {
    if (sample==="trough") band = level<1 ? "therapeutic (<1–2)" : level<=2 ? "borderline" : "elevated (toxicity risk)";
    else band = level>=5 && level<=10 ? "therapeutic (5–10)" : level<5 ? "low" : "high";
  } else if (drug==="amikacin") {
    if (sample==="trough") band = level<5 ? "therapeutic (<5–10)" : level<=10 ? "borderline" : "elevated (toxicity risk)";
    else band = level>=15 && level<=30 ? "therapeutic (15–30)" : level<15 ? "low" : "high";
  }
  return { band };
}

export type VancomycinInputs = { trough_mcg_mL: number };
export function runVancomycinBand({ trough_mcg_mL }: VancomycinInputs) {
  if (trough_mcg_mL==null || !isFinite(trough_mcg_mL)) return null;
  const band = trough_mcg_mL<10 ? "subtherapeutic (<10)" : trough_mcg_mL<=20 ? "therapeutic (10–20)" : "high (>20)";
  return { band };
}

export type PhenytoinInputs = { total_mcg_mL: number, albumin_g_dL: number, esrd?: boolean };
export function runPhenytoinCorrected({ total_mcg_mL, albumin_g_dL, esrd=false }: PhenytoinInputs) {
  if ([total_mcg_mL,albumin_g_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const denom = (esrd ? (0.1*albumin_g_dL + 0.1) : (0.2*albumin_g_dL + 0.1));
  const corrected = total_mcg_mL / denom;
  return { corrected: Number(corrected.toFixed(1)) };
}

export type WarfarinInputs = { inr: number, mechanical_valve?: boolean };
export function runWarfarinBand({ inr, mechanical_valve=false }: WarfarinInputs) {
  if (inr==null || !isFinite(inr)) return null;
  const low = mechanical_valve ? 2.5 : 2.0;
  const high = mechanical_valve ? 3.5 : 3.0;
  const band = inr<low ? "subtherapeutic" : inr<=high ? "therapeutic" : "supratherapeutic";
  return { target: `${low}-${high}`, band };
}

export type QTcInputs = { QT_ms: number, HR_bpm: number, sex?: "M"|"F" };
export function runQTc({ QT_ms, HR_bpm, sex="M" }: QTcInputs) {
  if ([QT_ms,HR_bpm].some(v=>v==null || !isFinite(v as number))) return null;
  const RR = 60/HR_bpm; // seconds
  const bazett = QT_ms / Math.sqrt(RR);
  const fridericia = QT_ms / Math.cbrt(RR);
  const thr = sex==="M" ? 450 : 470;
  const risk_baz = bazett>thr ? "prolonged" : bazett>=430 ? "borderline" : "normal";
  const risk_frd = fridericia>thr ? "prolonged" : fridericia>=430 ? "borderline" : "normal";
  return { QTc_Bazett_ms: Math.round(bazett), QTc_Fridericia_ms: Math.round(fridericia), risk_bazett: risk_baz, risk_fridericia: risk_frd };
}

register({ id:"renal_dosing_flag", label:"Renal dosing flag", inputs:[{key:"eGFR",required:true}], run: runRenalDosingFlag as any });
register({ id:"hepatic_dosing_flag", label:"Hepatic dosing flag", inputs:[{key:"child_pugh"},{key:"bilirubin_mg_dL"},{key:"albumin_g_dL"},{key:"INR"},{key:"ascites"},{key:"encephalopathy"}], run: runHepaticDosingFlag as any });
register({ id:"drug_level_bands", label:"Drug level bands", inputs:[{key:"drug",required:true},{key:"level",required:true},{key:"sample"}], run: runDrugLevelBand as any });
register({ id:"vancomycin_trough_band", label:"Vancomycin trough band", inputs:[{key:"trough_mcg_mL",required:true}], run: runVancomycinBand as any });
register({ id:"phenytoin_correction", label:"Phenytoin correction (albumin)", inputs:[{key:"total_mcg_mL",required:true},{key:"albumin_g_dL",required:true},{key:"esrd"}], run: runPhenytoinCorrected as any });
register({ id:"warfarin_inr_band", label:"Warfarin INR therapeutic band", inputs:[{key:"inr",required:true},{key:"mechanical_valve"}], run: runWarfarinBand as any });
register({ id:"qtc_dual", label:"QTc (Bazett & Fridericia)", inputs:[{key:"QT_ms",required:true},{key:"HR_bpm",required:true},{key:"sex"}], run: runQTc as any });
