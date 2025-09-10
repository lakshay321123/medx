import { runCaprini } from "../lib/medical/engine/calculators/caprini";

test("Caprini bands", ()=>{ const o=runCaprini({age_years:72,bmi_ge30:true,swollen_legs:false,varicose_veins:false,pregnant_or_postpartum:false,ocp_or_hormone:false,sepsis:false,serious_lung_disease:false,abnormal_pft:false,acute_mi:false,congestive_hf:false,bedrest_gt72h:true,prior_vte:true,family_history_vte:false,factor_v_leiden_or_thrombophilia:false,cancer:false,chemo:false,major_surgery_gt45min:true,arthroplasty_or_hip_fracture:false,stroke_with_paralysis:false})!; expect(o.risk_band).toMatch(/high|very/); });
