import { runPSI } from "../lib/medical/engine/calculators/psi";

test("PSI class", ()=>{ const o=runPSI({age_years:78,male:true,nursing_home:false,neoplastic_disease:false,liver_disease:false,chf:true,cerebrovascular:false,renal_disease:false,altered_mental_status:false,rr_bpm:32,sbp_mmHg:88,temp_c:35.2,hr_bpm:128,ph_arterial:7.31,bun_mg_dL:40,sodium_mEq_L:128,glucose_mg_dL:260,hematocrit_pct:28,SaO2_pct:88,pleural_effusion:true})!; expect(o.PSI).toBeGreaterThan(130); });
