  import { calc_qsofa } from "../lib/medical/engine/calculators/qsofa";

  describe("calc_qsofa", () => {

it("scores qSOFA = 3", () => {
  const v = calc_qsofa({ resp_rate: 22, sbp: 90, gcs: 14 });
  expect(v).toBe(3);
});

  });
