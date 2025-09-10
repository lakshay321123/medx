import { runTIMI } from "@/lib/medical/engine/calculators/timi_ua_nstemi";

test("TIMI bands", () => {
  const r = runTIMI({ age_ge_65:true, risk_factors_ge_3:true, known_cad_ge_50:false, asa_last_7d:false, severe_angina_2plus_24h:false, st_deviation:true, positive_markers:true });
  expect(r.score).toBe(5);
  expect(r.band).toBe("high");
});
