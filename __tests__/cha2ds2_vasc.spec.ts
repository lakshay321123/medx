import { runCHA2DS2VASc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

test("CHA2DS2-VASc basic", ()=>{ const o=runCHA2DS2VASc({congestive_hf:true,hypertension:true,age_years:78,diabetes:false,stroke_tia_thromboembolism:false,vascular_disease:true,female:true})!; expect(o.CHA2DS2_VASc).toBeGreaterThanOrEqual(4); });
