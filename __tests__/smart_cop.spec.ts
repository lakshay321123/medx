import { runSMARTCOP } from "../lib/medical/engine/calculators/smart_cop";

test("SMART-COP", ()=>{ const o=runSMARTCOP({sbp_mmHg:85,multilobar_involvement:true,albumin_g_L:32,rr_bpm:34,hr_bpm:130,confusion:true,pao2_mmHg:60,fio2:0.4,age_lt50:false,ph:7.30})!; expect(o.risk_band).toBe("high"); });
