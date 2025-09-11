import { calc_serum_osm } from "../lib/medical/engine/calculators/serum_osmolality";

describe("calc_serum_osm", () => {
  it("computes calculated osmolality and gap", () => {
    const r = calc_serum_osm({ sodium_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0, measured_osm_mosm_kg: 290 });
    const calc = 2*140 + 90/18 + 14/2.8;
    expect(r.calc).toBeCloseTo(calc, 2);
    expect(r.gap).toBeCloseTo(290 - calc, 2);
  });
});
