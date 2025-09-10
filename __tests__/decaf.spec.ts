import { runDECAF } from "../lib/medical/engine/calculators/decaf";

test("DECAF high", ()=>{ const o=runDECAF({emrcd_5a:false,emrcd_5b:true,eos_abs_k_uL:0.03,consolidation:true,ph:7.28,atrial_fibrillation:true})!; expect(o.risk_band).toBe("high"); });
