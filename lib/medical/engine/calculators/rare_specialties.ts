
import { register } from "../registry";

export type IOPInputs = { IOP_mmHg: number };
export function runIOPBand({ IOP_mmHg }: IOPInputs) {
  if (IOP_mmHg==null || !isFinite(IOP_mmHg)) return null;
  let band = "normal (10–21)";
  if (IOP_mmHg < 10) band = "low (hypotony?)";
  else if (IOP_mmHg > 21 && IOP_mmHg <= 30) band = "elevated";
  else if (IOP_mmHg > 30) band = "very high (urgent)";
  return { band };
}

export type IOPCCTInputs = { IOP_mmHg: number, CCT_um: number };
export function runIOPCorrected({ IOP_mmHg, CCT_um }: IOPCCTInputs) {
  if ([IOP_mmHg,CCT_um].some(v=>v==null || !isFinite(v as number))) return null;
  // Approx correction: 0.5 mmHg per 10 µm deviation from 545 µm
  const delta = (CCT_um - 545)/10 * 0.5;
  const corrected = IOP_mmHg + delta;
  return { corrected: Number(corrected.toFixed(1)) };
}

export type SnellenInputs = { numerator: number, denominator: number };
export function runSnellenToDecimal({ numerator, denominator }: SnellenInputs) {
  if ([numerator,denominator].some(v=>v==null || !isFinite(v as number))) return null;
  if (numerator<=0 || denominator<=0) return null;
  const decimal = numerator/denominator;
  return { decimal: Number(decimal.toFixed(2)) };
}

export type VFMDInputs = { md_dB: number };
export function runVFMDSeverity({ md_dB }: VFMDInputs) {
  if (md_dB==null || !isFinite(md_dB)) return null;
  let severity = "early/mild";
  if (md_dB <= -12) severity = "severe";
  else if (md_dB <= -6) severity = "moderate";
  return { severity };
}

export type WHOHearingInputs = { PTA_dB: number };
export function runWHOHearingGrade({ PTA_dB }: WHOHearingInputs) {
  if (PTA_dB==null || !isFinite(PTA_dB)) return null;
  let grade = "normal (<20)";
  if (PTA_dB >= 20 && PTA_dB <= 34) grade = "mild (20–34)";
  else if (PTA_dB <= 49) grade = "moderate (35–49)";
  else if (PTA_dB <= 64) grade = "moderately severe (50–64)";
  else if (PTA_dB <= 79) grade = "severe (65–79)";
  else grade = "profound (≥80)";
  return { grade };
}

// Simple derm severity index (0–3 intensity × area% band)
export type DermSimpleInputs = { area_pct: number, intensity_0_3: number };
export function runDermSimple({ area_pct, intensity_0_3 }: DermSimpleInputs) {
  if ([area_pct,intensity_0_3].some(v=>v==null || !isFinite(v as number))) return null;
  const score = (Math.max(0,Math.min(100,area_pct))/100) * Math.max(0,Math.min(3,intensity_0_3));
  let band = "mild"; if (score>=1.5 && score<2.0) band="moderate"; else if (score>=2.0) band="severe";
  return { score: Number(score.toFixed(2)), band };
}

// EASI (region multipliers: head 0.1, upper 0.2, trunk 0.3, lower 0.4)
export type EASIRegion = { area_pct: number, erythema_0_3: number, edema_0_3: number, excoriation_0_3: number, lichen_0_3: number };
export type EASIInputs = { head: EASIRegion, upper: EASIRegion, trunk: EASIRegion, lower: EASIRegion };

function areaScore(pct:number){
  if (pct<=0) return 0;
  if (pct<=9) return 1;
  if (pct<=29) return 2;
  if (pct<=49) return 3;
  if (pct<=69) return 4;
  if (pct<=89) return 5;
  return 6;
}
function region(i:EASIRegion, mult:number){
  const A = areaScore(i.area_pct);
  const I = i.erythema_0_3 + i.edema_0_3 + i.excoriation_0_3 + i.lichen_0_3;
  return mult * A * I;
}
export function runEASI(i: EASIInputs){
  if (!i) return null;
  const score = region(i.head,0.1)+region(i.upper,0.2)+region(i.trunk,0.3)+region(i.lower,0.4);
  return { easi: Number(score.toFixed(2)) };
}

register({ id:"iop_band", label:"IOP band", inputs:[{key:"IOP_mmHg",required:true}], run: runIOPBand as any });
register({ id:"iop_corrected_cct", label:"IOP corrected for corneal thickness", inputs:[{key:"IOP_mmHg",required:true},{key:"CCT_um",required:true}], run: runIOPCorrected as any });
register({ id:"snellen_decimal", label:"Visual acuity (Snellen → decimal)", inputs:[{key:"numerator",required:true},{key:"denominator",required:true}], run: runSnellenToDecimal as any });
register({ id:"vf_md_severity", label:"Visual field MD severity (glaucoma)", inputs:[{key:"md_dB",required:true}], run: runVFMDSeverity as any });
register({ id:"who_hearing_grade", label:"Hearing loss WHO grade (PTA)", inputs:[{key:"PTA_dB",required:true}], run: runWHOHearingGrade as any });
register({ id:"derm_simple", label:"Derm severity index (simple)", inputs:[{key:"area_pct",required:true},{key:"intensity_0_3",required:true}], run: runDermSimple as any });
register({ id:"easi", label:"EASI (Eczema Area Severity Index)", inputs:[{key:"head",required:true},{key:"upper",required:true},{key:"trunk",required:true},{key:"lower",required:true}], run: runEASI as any });
