import { runADHERE } from "../lib/medical/engine/calculators/adhere_tree";

test("ADHERE flag", ()=>{ const o=runADHERE({bun_mg_dL:50,sbp_mmHg:120,creat_mg_dL:1.8})!; expect(o.ADHERE_high_risk).toBe(true); });
