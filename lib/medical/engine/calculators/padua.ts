import { register } from "../registry";

export function runPadua(i:{ active_cancer:boolean, previous_vte:boolean, reduced_mobility:boolean, thrombophilia:boolean, trauma_or_surgery_1m:boolean, age_ge70:boolean, heart_or_respiratory_failure:boolean, mi_or_stroke:boolean, acute_infection_or_rheum:boolean, bmi_ge30:boolean, hormonal_treatment:boolean }){
  if (i==null) return null;
  let pts = 0;
  pts += i.active_cancer?3:0;
  pts += i.previous_vte?3:0;
  pts += i.reduced_mobility?3:0;
  pts += i.thrombophilia?3:0;
  pts += i.trauma_or_surgery_1m?2:0;
  pts += i.age_ge70?1:0;
  pts += i.heart_or_respiratory_failure?1:0;
  pts += i.mi_or_stroke?1:0;
  pts += i.acute_infection_or_rheum?1:0;
  pts += i.bmi_ge30?1:0;
  pts += i.hormonal_treatment?1:0;
  return { Padua: pts, high_risk: pts>=4 };
}
register({ id:"padua_vte", label:"Padua VTE risk (medical inpatients)", inputs:[
  {key:"active_cancer",required:true},{key:"previous_vte",required:true},{key:"reduced_mobility",required:true},{key:"thrombophilia",required:true},
  {key:"trauma_or_surgery_1m",required:true},{key:"age_ge70",required:true},{key:"heart_or_respiratory_failure",required:true},{key:"mi_or_stroke",required:true},
  {key:"acute_infection_or_rheum",required:true},{key:"bmi_ge30",required:true},{key:"hormonal_treatment",required:true}
], run: runPadua as any });
