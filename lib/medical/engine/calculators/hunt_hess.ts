import { register } from "../registry";

export function runHuntHess(i:{ headache_mild:boolean, nuchal_rigidity:boolean, cranial_nerve_palsy:boolean, drowsy_or_confused:boolean, mild_focal_deficit:boolean, stupor:boolean, severe_focal_deficit:boolean, decerebrate_posturing:boolean }){
  if (i==null) return null;
  let grade:1|2|3|4|5 = 1;
  if (i.nuchal_rigidity || i.cranial_nerve_palsy) grade = 2;
  if (i.drowsy_or_confused || i.mild_focal_deficit) grade = 3;
  if (i.stupor || i.severe_focal_deficit) grade = 4;
  if (i.decerebrate_posturing) grade = 5;
  return { Hunt_Hess: grade };
}
register({ id:"hunt_hess", label:"Hunt–Hess (SAH grade)", inputs:[
  {key:"headache_mild",required:true},{key:"nuchal_rigidity",required:true},{key:"cranial_nerve_palsy",required:true},
  {key:"drowsy_or_confused",required:true},{key:"mild_focal_deficit",required:true},{key:"stupor",required:true},{key:"severe_focal_deficit",required:true},{key:"decerebrate_posturing",required:true}
], run: runHuntHess as any });
