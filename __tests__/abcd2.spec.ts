import { runABCD2 } from "../lib/medical/engine/calculators/abcd2";

test("ABCD2", ()=>{ const o=runABCD2({age_ge60:true,sbp_ge140_or_dbp_ge90:true,clinical_weakness:false,clinical_speech_only:true,duration_ge60min:false,duration_10_59min:true,diabetes:true})!; expect(o.ABCD2).toBeGreaterThanOrEqual(3); });
