import { runCHA2DS2VASc } from "@/lib/medical/engine/calculators/cha2ds2_vasc";

test("CHA2DS2-VASc", () => {
  const r = runCHA2DS2VASc({ chf:true, htn:true, age:78, dm:true, stroke_tia_thromboembolism:true, vascular_disease:true, female_sex:false });
  expect(r.score).toBe(8);
});
