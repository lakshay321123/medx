import { runBurchWartofsky } from "../lib/medical/engine/calculators/burch_wartofsky";

test("Burch-Wartofsky", ()=>{ const o=runBurchWartofsky({temp_c:39.5,cns:true,gi_hepatic:true,tachycardia_bpm:140,heart_failure:false,afib:true,precipitating_event:true})!; expect(o.Burch_Wartofsky).toBeGreaterThanOrEqual(45); });
