import { runMurrayLIS } from "../lib/medical/engine/calculators/murray_lis";

test("Murray LIS", ()=>{ const o=runMurrayLIS({cxr_quadrants_involved:4,pao2_mmHg:80,fio2:0.8,peep_cmH2O:15,compliance_mL_cmH2O:30})!; expect(o.Murray_LIS).toBeGreaterThan(1.0); });
