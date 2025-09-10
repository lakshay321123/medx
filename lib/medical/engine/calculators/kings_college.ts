import { register } from "../registry";

export function runKingsCollege(i:{ etiology:"apap"|"non_apap", arterial_ph?:number, inr:number, creat_mg_dL:number, grade_encephalopathy:0|1|2|3|4, age_years?:number, days_jaundice_to_enceph?:number, bilirubin_mg_dL?:number }){
  if (i==null) return null;
  if (i.etiology==="apap"){
    const crit = (i.arterial_ph!=null && i.arterial_ph<7.3) || (i.inr>6.5 && i.creat_mg_dL>=3.4 && (i.grade_encephalopathy>=3));
    return { transplant_criteria_met: !!crit, rule:"APAP" };
  } else {
    const extras = [
      (i.age_years!=null && (i.age_years<10 || i.age_years>40)),
      (i.days_jaundice_to_enceph!=null && i.days_jaundice_to_enceph>7),
      i.inr>3.5,
      (i.bilirubin_mg_dL!=null && i.bilirubin_mg_dL>17.5)
    ].filter(Boolean).length;
    const crit = (i.inr>6.5) || (extras>=3);
    return { transplant_criteria_met: !!crit, rule:"Non‑APAP" };
  }
}
register({ id:"kings_college", label:"King’s College (ALF transplant criteria)", inputs:[
  {key:"etiology",required:true},{key:"arterial_ph"},{key:"inr",required:true},{key:"creat_mg_dL",required:true},{key:"grade_encephalopathy",required:true},
  {key:"age_years"},{key:"days_jaundice_to_enceph"},{key:"bilirubin_mg_dL"}
], run: runKingsCollege as any });
