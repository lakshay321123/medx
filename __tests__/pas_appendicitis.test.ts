import { runPAS } from "@/lib/medical/engine/calculators/pas_appendicitis";

test("PAS scoring", () => {
  const low = runPAS({ anorexia:false, nausea_vomiting:false, pain_migration:false, fever_ge_38:false, cough_hop_tender:false, rlq_tender:false, wbc_ge_10:false, anc_ge_7_5:false });
  expect(low.score).toBe(0);
  expect(low.risk).toBe("low");
  const hi = runPAS({ anorexia:true, nausea_vomiting:true, pain_migration:true, fever_ge_38:true, cough_hop_tender:true, rlq_tender:true, wbc_ge_10:true, anc_ge_7_5:true });
  expect(hi.score).toBe(10);
  expect(hi.risk).toBe("high");
});
