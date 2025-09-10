import { register } from "../registry";

export function runNEXUS_Chest(i:{ age_gt60:boolean, rapid_deceleration_mechanism:boolean, chest_pain:boolean, intoxication:boolean, abnormal_alertness_or_mental_status:boolean, distracting_injury:boolean, chest_wall_tenderness:boolean }){
  if (i==null) return null;
  const any = Object.values(i).some(Boolean);
  return { imaging_indicated: any, rule_negative: !any };
}
register({ id:"nexus_chest", label:"NEXUS Chest", inputs:[
  {key:"age_gt60",required:true},{key:"rapid_deceleration_mechanism",required:true},{key:"chest_pain",required:true},
  {key:"intoxication",required:true},{key:"abnormal_alertness_or_mental_status",required:true},{key:"distracting_injury",required:true},{key:"chest_wall_tenderness",required:true}
], run: runNEXUS_Chest as any });
