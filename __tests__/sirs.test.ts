  import { calc_sirs } from "../lib/medical/engine/calculators/sirs";

  describe("calc_sirs", () => {

it("counts SIRS criteria = 4", () => {
  const v = calc_sirs({ temp_c: 38.5, hr: 100, rr: 22, wbc: 15 });
  expect(v).toBe(4);
});

  });
