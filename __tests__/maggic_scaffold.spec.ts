import { runMAGGIC } from "../lib/medical/engine/calculators/maggic_scaffold";

test("MAGGIC scaffold", ()=>{ const o=runMAGGIC({age_years:70,ef_pct:25,nyha_class:3,sbp_mmHg:100,bmi:24,creat_mg_dL:1.8,female:false,copd:true,diabetes:false,current_smoker:true})!; expect(o.MAGGIC_surrogate).toBeGreaterThan(0); });
