import { runLactateClearance } from "@/lib/medical/engine/calculators/lactate_clearance";

test("Lactate clearance", () => {
  const r = runLactateClearance({ initial_mmol_l:4.0, subsequent_mmol_l:2.0 });
  expect(r.clearance_percent).toBeCloseTo(50, 2);
});
