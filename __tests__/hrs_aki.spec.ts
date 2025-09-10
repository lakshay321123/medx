import { runHRS_AKI } from "../lib/medical/engine/calculators/hrs_aki";

test("HRS-AKI supportive", ()=>{ const o=runHRS_AKI({cirrhosis_with_ascites:true,aki_stage_ge1:true,shock_present:false,nephrotoxin_exposure:false,structural_kidney_disease:false,no_creat_improve_after_albumin:true})!; expect(o.HRS_AKI_supportive).toBe(true); });
