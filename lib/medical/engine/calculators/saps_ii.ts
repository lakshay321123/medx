// lib/medical/engine/calculators/saps_ii.ts
// SAPS II point-based calculator (core bins). Returns total points and component breakdown.
// Note: Use for decision support; institutional implementations may vary.

export interface SAPSIIInput {
  age_years?: number | null;
  hr_bpm?: number | null;
  sbp_mmHg?: number | null;
  temp_c?: number | null;
  gcs?: number | null;
  pf_ratio?: number | null;           // PaO2/FiO2
  urine_output_mL_24h?: number | null;
  wbc_k_per_uL?: number | null;
  potassium_mEq_L?: number | null;
  sodium_mEq_L?: number | null;
  bicarbonate_mEq_L?: number | null;
  bilirubin_mg_dL?: number | null;

  admission_type?: "scheduled_surgical" | "unscheduled_surgical" | "medical" | null;
  aids?: boolean | null;
  metastatic_cancer?: boolean | null;
  hematologic_malignancy?: boolean | null;
}

export interface SAPSIIOutput {
  total_points: number;
  components: Record<string, number>;
}

function ptsAge(a:number){ if(a<40)return 0; if(a<60)return 7; if(a<70)return 12; if(a<75)return 15; if(a<80)return 16; return 18; }
function ptsHR(x:number){ if(x<40)return 11; if(x<55)return 3; if(x<70)return 2; if(x<120)return 0; if(x<160)return 7; return 13; }
function ptsSBP(x:number){ if(x<70)return 13; if(x<100)return 5; if(x<200)return 0; return 2; }
function ptsTemp(t:number){ if(t<32)return 4; if(t<34)return 2; if(t<36)return 1; if(t<38)return 0; if(t<39)return 1; return 3; }
function ptsGCS(g:number){ const v=Math.max(3,Math.min(15,Math.round(g))); if(v>=14)return 0; if(v>=11)return 5; if(v>=9)return 7; if(v>=6)return 13; return 26; }
function ptsPF(p:number){ if(p<100)return 11; if(p<200)return 9; if(p<300)return 6; return 0; }
function ptsUrine(u:number){ if(u<500)return 11; if(u<1000)return 4; return 0; }
function ptsWBC(w:number){ if(w<1)return 12; if(w>=20)return 3; return 0; }
function ptsK(k:number){ if(k>=6)return 4; if(k>=5)return 1; if(k<3)return 3; return 0; }
function ptsNa(n:number){ if(n<125)return 5; if(n>=145)return 1; return 0; }
function ptsHCO3(b:number){ if(b<15)return 6; if(b<20)return 3; if(b<25)return 1; return 0; }
function ptsBili(b:number){ if(b>=12)return 16; if(b>=6)return 9; if(b>=4)return 4; return 0; }
function ptsAdm(t: SAPSIIInput["admission_type"]){ if(t==="unscheduled_surgical")return 8; if(t==="medical")return 6; return 0; }
function ptsComorb(a:boolean, m:boolean, h:boolean){ return (a?17:0)+(m?9:0)+(h?10:0); }

export function runSAPSII(i: SAPSIIInput): SAPSIIOutput {
  const comp: Record<string, number> = {};
  comp.age = (i.age_years ?? null) !== null ? ptsAge(i.age_years as number) : 0;
  comp.hr = (i.hr_bpm ?? null) !== null ? ptsHR(i.hr_bpm as number) : 0;
  comp.sbp = (i.sbp_mmHg ?? null) !== null ? ptsSBP(i.sbp_mmHg as number) : 0;
  comp.temp = (i.temp_c ?? null) !== null ? ptsTemp(i.temp_c as number) : 0;
  comp.gcs = (i.gcs ?? null) !== null ? ptsGCS(i.gcs as number) : 0;
  comp.pf = (i.pf_ratio ?? null) !== null ? ptsPF(i.pf_ratio as number) : 0;
  comp.urine = (i.urine_output_mL_24h ?? null) !== null ? ptsUrine(i.urine_output_mL_24h as number) : 0;
  comp.wbc = (i.wbc_k_per_uL ?? null) !== null ? ptsWBC(i.wbc_k_per_uL as number) : 0;
  comp.k = (i.potassium_mEq_L ?? null) !== null ? ptsK(i.potassium_mEq_L as number) : 0;
  comp.na = (i.sodium_mEq_L ?? null) !== null ? ptsNa(i.sodium_mEq_L as number) : 0;
  comp.hco3 = (i.bicarbonate_mEq_L ?? null) !== null ? ptsHCO3(i.bicarbonate_mEq_L as number) : 0;
  comp.bili = (i.bilirubin_mg_dL ?? null) !== null ? ptsBili(i.bilirubin_mg_dL as number) : 0;
  comp.adm = ptsAdm(i.admission_type ?? null);
  comp.comorb = ptsComorb(!!i.aids, !!i.metastatic_cancer, !!i.hematologic_malignancy);

  const total = Object.values(comp).reduce((a,b)=>a+b,0);
  return { total_points: total, components: comp };
}
