import { runUrineOsmolalityEstimate } from "@/lib/medical/engine/calculators/urine_osmolality_estimate";

test("Urine osmolality estimate", () => {
  const r = runUrineOsmolalityEstimate({ urine_na_meq_l:60, urine_k_meq_l:40, urine_urea_mg_dl:280, urine_glucose_mg_dl:180 });
  expect(r.estimated_uosm_mosm_kg).toBeCloseTo(2*(60+40) + 280/2.8 + 180/18, 3);
});
