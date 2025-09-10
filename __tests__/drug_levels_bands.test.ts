
import { runLithiumBand } from "@/lib/medical/engine/calculators/lithium_level_band";
import { runDigoxinBand } from "@/lib/medical/engine/calculators/digoxin_level_band";
import { runAminoglycosideBand } from "@/lib/medical/engine/calculators/aminoglycoside_level_band";
test("Lithium therapeutic", () => {
  expect(runLithiumBand({ lithium_meq_l: 0.8 }).band).toBe("therapeutic");
});
test("Digoxin toxic", () => {
  expect(runDigoxinBand({ digoxin_ng_ml: 2.5 }).band).toBe("toxic");
});
test("Gentamicin window", () => {
  const r = runAminoglycosideBand({ drug: "gentamicin", peak_mcg_ml: 8, trough_mcg_ml: 1.5 });
  expect(r.peak_ok).toBe(true);
  expect(r.trough_ok).toBe(true);
});
