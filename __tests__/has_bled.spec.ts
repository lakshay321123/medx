import { runHASBLED } from "../lib/medical/engine/calculators/has_bled";

test("HAS-BLED high", ()=>{ const o=runHASBLED({hypertension:true,abnormal_renal:true,abnormal_liver:false,stroke:false,bleeding:true,labile_inr:true,age_gt65:true,drugs_antiplatelet_nsaid:true,alcohol:true})!; expect(o.HAS_BLED).toBeGreaterThanOrEqual(3); });
