import { register } from "../registry";

export type ICHInputs = {
  GCS: number, Volume_mL: number, Infratentorial: boolean, IVH: boolean, Age: number
};

export function runICHScore({GCS, Volume_mL, Infratentorial, IVH, Age}: ICHInputs) {
  if ([GCS,Volume_mL,Infratentorial,IVH,Age].some(v => v==null)) return null;
  let score = 0;
  if (GCS <= 4) score += 2;
  else if (GCS <= 8) score += 1;
  // Age
  if (Age >= 80) score += 1;
  // Volume
  if (Volume_mL >= 30) score += 1;
  // Infratentorial
  if (Infratentorial) score += 1;
  // IVH
  if (IVH) score += 1;
  return { score };
}

register({
  id: "ich_score",
  label: "ICH Score",
  inputs: [{key:"GCS",required:true},{key:"Volume_mL",required:true},{key:"Infratentorial",required:true},{key:"IVH",required:true},{key:"Age",required:true}],
  run: runICHScore as any,
});
