import { runPadua } from "@/lib/medical/engine/calculators/padua_vte";

test("Padua VTE high risk", () => {
  const r = runPadua({ active_cancer:true, previous_vte:false, reduced_mobility:true, thrombophilia:false, recent_trauma_or_surgery_lt_1mo:false, age:75, heart_or_respiratory_failure:false, acute_mi_or_stroke:false, acute_infection_or_rheum:false, bmi:31, hormonal_therapy:false });
  expect(r.score).toBe(3 + 3 + 1 + 1);
  expect(r.high_risk).toBe(true);
});
