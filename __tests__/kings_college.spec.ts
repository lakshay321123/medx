import { runKingsCollege } from "../lib/medical/engine/calculators/kings_college";

test("King’s College (APAP)", ()=>{ const o=runKingsCollege({etiology:"apap",arterial_ph:7.2,inr:7.0,creat_mg_dL:3.6,grade_encephalopathy:4})!; expect(o.transplant_criteria_met).toBe(true); });
