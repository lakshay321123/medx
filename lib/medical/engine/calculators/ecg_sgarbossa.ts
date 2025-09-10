
import { register } from "../registry";

export type SgarbossaInputs = {
  concordant_ste_mm_ge1: boolean,
  concordant_std_v1_v3_mm_ge1: boolean,
  discordant_ste_mm_ge5: boolean
};

export function runSgarbossa(i:SgarbossaInputs){
  if (i==null) return null;
  let score = 0;
  if (i.concordant_ste_mm_ge1) score += 5;
  if (i.concordant_std_v1_v3_mm_ge1) score += 3;
  if (i.discordant_ste_mm_ge5) score += 2;
  return { sgarbossa_score: score, positive: score>=3 };
}

export type ModifiedSgarbossaInputs = {
  lead_st_mm: number,     // ST elevation magnitude in mm at J point in the lead with maximal discordance
  lead_s_wave_mm: number  // S-wave depth in mm (absolute value)
};

export function runModifiedSgarbossa({ lead_st_mm, lead_s_wave_mm }: ModifiedSgarbossaInputs){
  if ([lead_st_mm,lead_s_wave_mm].some(v=>v==null || !isFinite(v as number) || lead_s_wave_mm<=0)) return null;
  const ratio = (lead_st_mm / -Math.abs(lead_s_wave_mm)); // ST discordant elevation is opposite polarity to QRS
  const positive = ratio <= -0.25; // Smith-modified criterion
  return { smith_sgarbossa_ratio: Number(ratio.toFixed(2)), positive };
}

register({ id:"ecg_sgarbossa", label:"Sgarbossa (LBBB/V-paced)", inputs:[
  {key:"concordant_ste_mm_ge1",required:true},{key:"concordant_std_v1_v3_mm_ge1",required:true},{key:"discordant_ste_mm_ge5",required:true}
], run: runSgarbossa as any });

register({ id:"ecg_modified_sgarbossa", label:"Modified Sgarbossa (Smith ratio)", inputs:[
  {key:"lead_st_mm",required:true},{key:"lead_s_wave_mm",required:true}
], run: runModifiedSgarbossa as any });
