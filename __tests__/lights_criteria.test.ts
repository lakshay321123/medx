  import { calc_lights_criteria } from "../lib/medical/engine/calculators/lights_criteria";

  describe("calc_lights_criteria", () => {

it("flags exudate", () => {
  const r = calc_lights_criteria({ pleural_protein_g_dl: 4.0, serum_protein_g_dl: 6.0, pleural_ldh: 500, serum_ldh: 200, ldh_uln: 250 });
  expect(r.exudate).toBe(true);
});

  });
