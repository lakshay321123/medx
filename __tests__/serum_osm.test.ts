import { calc_serum_osm } from "../lib/medical/engine/calculators/serum_osm";

describe("calc_serum_osm", () => {
  it("computes calculated osmolality and gap", () => {
    const r = calc_serum_osm({ na_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0, measured_osm_mOsm_kg: 295 });
    const calc = 2*140 + 90/18 + 14/2.8 + 0/3.7;
    expect(r.calculated).toBeCloseTo(calc, 6);
    expect(r.osm_gap).toBeCloseTo(295 - calc, 6);
  });
});
