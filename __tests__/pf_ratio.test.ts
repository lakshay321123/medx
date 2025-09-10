  import { calc_pf_ratio } from "../lib/medical/engine/calculators/pf_ratio";

  describe("calc_pf_ratio", () => {

it("computes P/F ratio and ARDS band", () => {
  const r = calc_pf_ratio({ pao2: 80, fio2: 0.5 });
  expect(r.ratio).toBeCloseTo(160, 0);
  expect(r.band).toBe("moderate ARDS range");
});

  });
