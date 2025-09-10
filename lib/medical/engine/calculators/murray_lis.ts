import { register } from "../registry";

export function runMurrayLIS(i:{ cxr_quadrants_involved:number, pao2_mmHg:number, fio2:number, peep_cmH2O:number, compliance_mL_cmH2O:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const chest = Math.min(4, Math.max(0, i.cxr_quadrants_involved)) / 4; // 0–1
  const oxygenation = (i.pao2_mmHg/i.fio2) < 100 ? 3 : (i.pao2_mmHg/i.fio2) < 200 ? 2 : (i.pao2_mmHg/i.fio2) < 300 ? 1 : 0;
  const peep = i.peep_cmH2O>=16?3 : i.peep_cmH2O>=13?2 : i.peep_cmH2O>=8?1 : 0;
  const compl = i.compliance_mL_cmH2O<20?3 : i.compliance_mL_cmH2O<40?2 : i.compliance_mL_cmH2O<80?1 : 0;
  const total = (chest + oxygenation + peep + compl) / 4;
  return { Murray_LIS: Number(total.toFixed(2)) };
}
register({ id:"murray_lis", label:"Murray Lung Injury Score", inputs:[
  {key:"cxr_quadrants_involved",required:true},{key:"pao2_mmHg",required:true},{key:"fio2",required:true},{key:"peep_cmH2O",required:true},{key:"compliance_mL_cmH2O",required:true}
], run: runMurrayLIS as any });
