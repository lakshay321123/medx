import { lactateClearancePercent } from "../lib/medical/engine/calculators/lactate_clearance";

test("Lactate clearance basic", () => {
  const pct = lactateClearancePercent(6.0, 3.9);
  expect(pct).toBeCloseTo(35.0, 0);
});
