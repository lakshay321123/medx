import { runSTOPBANG } from "../lib/medical/engine/calculators/stop_bang";

test("STOP-Bang", ()=>{ const o=runSTOPBANG({snoring:true,tired:true,observed_apnea:true,high_bp:true,bmi_gt35:true,age_gt50:true,neck_circ_cm_gt40:true,male:true})!; expect(o.risk_band).toMatch(/high/); });
