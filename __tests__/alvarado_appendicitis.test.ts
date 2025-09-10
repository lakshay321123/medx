import { runAlvarado } from "@/lib/medical/engine/calculators/alvarado_appendicitis";

test("Alvarado bands", () => {
  const r = runAlvarado({ migration_rlq:true, anorexia:true, nausea_vomiting:true, rlq_tenderness:true, rebound_tenderness:true, fever_ge_37_3:true, wbc_ge_10:true, neutrophils_ge_75_percent:true });
  expect(r.score).toBe(10);
  expect(r.band).toBe("very_probable");
});
