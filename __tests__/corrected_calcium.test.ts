  import { calc_corrected_calcium } from "../../lib/medical/engine/calculators/corrected_calcium";

  describe("calc_corrected_calcium", () => {

it("corrects calcium for albumin", () => {
  const v = calc_corrected_calcium({ ca_mg_dl: 8.0, albumin_g_dl: 2.0 });
  expect(v).toBeCloseTo(9.6, 2);
});

  });
