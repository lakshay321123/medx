/**
 * GAP index for IPF staging.
 * Gender: Female=0, Male=1
 * Age (years): <=60=0, 61–65=1, >65=2
 * FVC % predicted: >=75=0, 50–74=1, <50=2
 * DLCO % predicted (corrected): >=55=0, 36–55=1, <=35=2, or 'unable to perform' = 3
 * Stage: 0–3 = I, 4–5 = II, 6–8 = III
 */
export interface GAPInput {
  male: boolean;
  age_years: number;
  fvc_pct_pred: number;
  dlco_pct_pred?: number; // if undefined but unavailable, set dlco_unavailable=true
  dlco_unavailable?: boolean;
}
export interface GAPOutput {
  points: number;
  stage: "I"|"II"|"III";
  breakdown: { gender:number; age:number; fvc:number; dlco:number };
}
function genderPts(male:boolean){ return male?1:0; }
function agePts(age:number){ if (age>65) return 2; if (age>=61) return 1; return 0; }
function fvcPts(fvc:number){ if (fvc<50) return 2; if (fvc<75) return 1; return 0; }
function dlcoPts(dlco?:number, unavailable?:boolean){
  if (unavailable) return 3;
  if (dlco===undefined || Number.isNaN(dlco)) return 3; // treat missing as unavailable per original guidance
  if (dlco<=35) return 2;
  if (dlco<=55) return 1;
  return 0;
}
export function runGAP(i:GAPInput): GAPOutput {
  const g = genderPts(i.male);
  const a = agePts(i.age_years);
  const f = fvcPts(i.fvc_pct_pred);
  const d = dlcoPts(i.dlco_pct_pred, i.dlco_unavailable);
  const points = g+a+f+d;
  const stage: "I"|"II"|"III" = points<=3 ? "I" : (points<=5 ? "II" : "III");
  return { points, stage, breakdown: { gender:g, age:a, fvc:f, dlco:d } };
}
