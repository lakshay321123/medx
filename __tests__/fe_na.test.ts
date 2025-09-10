  import { calc_fena } from "../../lib/medical/engine/calculators/fe_na";

  describe("calc_fena", () => {

it("computes FENa", () => {
  const v = calc_fena({ urine_na: 40, serum_na: 140, urine_cr: 100, serum_cr: 2 });
  // (40*2)/(140*100)*100 = 0.5714...
  expect(v).toBeCloseTo(0.571, 3);
});

  });
