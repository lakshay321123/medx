import { runCCHR } from "@/lib/medical/engine/calculators/canadian_ct_head";

test("CCHR recommendation", () => {
  const r = runCCHR({ gcs_lt_15_at_2h:false, suspected_open_or_depressed_skull_fracture:false, signs_of_basal_skull_fracture:false, vomiting_ge_2:false, age_ge_65:true, amnesia_ge_30min:false, dangerous_mechanism:false });
  expect(r.recommend_ct).toBe(true);
});
