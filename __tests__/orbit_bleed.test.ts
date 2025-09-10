
import { orbit } from "../lib/medical/engine/calculators/orbit_bleed";

test("ORBIT high", () => {
  const out = orbit({ age_ge_75:true, anemia_or_low_hb:true, bleeding_history:true, egfr_lt_60:true, antiplatelet_therapy:true });
  expect(out.points).toBe(7);
  expect(out.band).toBe("high");
});
