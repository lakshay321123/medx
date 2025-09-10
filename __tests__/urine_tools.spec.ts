import { runUAG, runFEPhos } from "../lib/medical/engine/calculators/urine_tools";

test("UAG & FEPhos", ()=>{ const u=runUAG({una_mEq_L:40,uka_mEq_L:20,ucl_mEq_L:50})!; expect(u.urine_anion_gap_mEq_L).toBe(10); const f=runFEPhos({uphos_mg_dL:20,sphos_mg_dL:3,ucr_mg_dL:60,scr_mg_dL:1.2})!; expect(f.FEPhos_pct).toBeGreaterThan(0); });
