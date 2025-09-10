  import { calc_osmolal_gap } from "../../lib/medical/engine/calculators/osm_gap";

  describe("calc_osmolal_gap", () => {

it("computes osmolal gap", () => {
  const v = calc_osmolal_gap({ measured_osm: 310, Na: 140, glucose_mg_dl: 90, bun_mg_dl: 14 });
  // calc = 294 → gap = 16
  expect(Math.round(v!)).toBe(16);
});

  });
