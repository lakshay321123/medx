import { runAPACHEII } from "../lib/medical/engine/calculators/apache_ii";

test("APACHE II", ()=>{ const o:any = runAPACHEII({temp_c:38.5,map_mmHg:65,hr_bpm:120,rr_bpm:30,aa_gradient_mmHg:400,ph:7.25,sodium_mEq_L:150,potassium_mEq_L:5.8,creat_mg_dL:2.5,hematocrit_pct:28,wbc_k_uL:18,gcs:10,age_years:70,chronic_organ_insufficiency:true,post_op:false}); expect(o.APACHE_II).toBeGreaterThan(20); });
