import { runSAPSII } from "../lib/medical/engine/calculators/saps_ii";

test("SAPS II", ()=>{ const o=runSAPSII({age_years:80,hr_bpm:150,sbp_mmHg:85,temp_c:39,GCS:10,pao2_mmHg:80,fio2:0.6,bun_mg_dL:90,urine_mL_day:400,sodium_mEq_L:124,potassium_mEq_L:5.5,bicarb_mEq_L:18,bilirubin_mg_dL:7,cancer_metastatic:true,hematologic_malignancy:false,aids:false,type_of_admission:"medical"})!; expect(o.SAPS_II).toBeGreaterThan(50); });
