import { runCRUSADE } from "../lib/medical/engine/calculators/crusade_bleeding";

test("CRUSADE computes", ()=>{ const o=runCRUSADE({hct_pct:35,crcl_mL_min:40,hr_bpm:100,sbp_mmHg:105,female:true,signs_of_chf:true,prior_vascular_disease:false,diabetes:true})!; expect(o.CRUSADE).toBeGreaterThan(0); });
