
import { register } from "../registry";

// BOVA stages mortality risk in hemodynamically stable PE
export function runBOVA(i:{ sbp_mmHg:number, hr_bpm:number, rv_dysfunction:boolean, elevated_troponin:boolean }){
  if (i==null) return null;
  let pts = 0;
  if (i.sbp_mmHg>=90 && i.sbp_mmHg<=100) pts += 2;
  if (i.hr_bpm>=110) pts += 2;
  if (i.rv_dysfunction) pts += 2;
  if (i.elevated_troponin) pts += 2;
  const stage = pts<=2 ? 1 : pts<=4 ? 2 : 3;
  return { BOVA_points: pts, stage };
}

register({ id:"bova_pe", label:"BOVA risk (PE)", inputs:[
  {key:"sbp_mmHg",required:true},{key:"hr_bpm",required:true},{key:"rv_dysfunction",required:true},{key:"elevated_troponin",required:true}
], run: runBOVA as any });
