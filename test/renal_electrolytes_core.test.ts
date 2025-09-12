import { expect, test } from "vitest";
import { computeAll } from "../lib/medical/engine/computeAll";
test("electrolytes/renal canonical sanity", () => {
  const ctx = { Na:128, Cl:90, HCO3:10, glucose_mgdl:560, BUN:28, albumin:3.8, Cr:1.3, Osm_measured:320, sex:"male", age:37 };
  const r = Object.fromEntries(computeAll(ctx).map(x => [x.id, x]));
  expect(r["corrected_na_hyperglycemia"].value).toBeCloseTo(139.0,1);
  expect(r["delta_ratio_ag"].value).toBeGreaterThan(0.9);
  expect(r["serum_osmolality"].value).toBeCloseTo(297,0);
  expect(r["osmolal_gap"].value).toBeCloseTo(23,0);
});
