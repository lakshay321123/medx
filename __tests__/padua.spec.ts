import { runPadua } from "../lib/medical/engine/calculators/padua";

test("Padua high risk", ()=>{ const o=runPadua({active_cancer:true,previous_vte:false,reduced_mobility:true,thrombophilia:false,trauma_or_surgery_1m:true,age_ge70:false,heart_or_respiratory_failure:false,mi_or_stroke:false,acute_infection_or_rheum:false,bmi_ge30:false,hormonal_treatment:false})!; expect(o.high_risk).toBe(true); });
