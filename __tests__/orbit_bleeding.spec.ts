import { runORBIT } from "../lib/medical/engine/calculators/orbit_bleeding";

test("ORBIT medium/high", ()=>{ const o=runORBIT({age_ge75:true,low_hgb_or_hct_or_anemia:true,eGFR_lt60:true,bleeding_history:false,antiplatelet_therapy:false})!; expect(o.risk_band).not.toBe("low"); });
