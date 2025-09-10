  import { calc_padua_vte } from "../lib/medical/engine/calculators/padua_vte";

  describe("calc_padua_vte", () => {

it("scores Padua VTE (high risk)", () => {
  const v = calc_padua_vte({
    active_cancer: true,
    previous_vte: true,
    reduced_mobility: true,
    age_ge_70: true,
  });
  expect(v).toBe(10);
});

  });
