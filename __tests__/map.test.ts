  import { calc_map } from "../lib/medical/engine/calculators/map";

  describe("calc_map", () => {

it("computes MAP for 120/80", () => {
  const v = calc_map({ sbp: 120, dbp: 80 });
  expect(v).toBeCloseTo(93.3, 1);
});

  });
