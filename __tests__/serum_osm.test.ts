  import { calc_serum_osm } from "../../lib/medical/engine/calculators/serum_osm";

  describe("calc_serum_osm", () => {

it("computes serum osmolality", () => {
  const v = calc_serum_osm({ Na: 140, glucose_mg_dl: 90, bun_mg_dl: 14 });
  expect(Math.round(v!)).toBe(294);
});

  });
