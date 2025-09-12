/**
 * Osmolality and gap tests
 */
import { describe, test, expect } from "vitest";
import { all } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

function get(id: string) {
  const f = all().find(f => f.id === id);
  if (!f) throw new Error("Formula not found: " + id);
  return f;
}

describe("Osmolality", () => {
  test("Calculated osmolality matches 2*Na + glu/18 + bun/2.8 when ethanol=0", () => {
    const f = get("osmolality_and_gap");
    const ctx = { Na_meq_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0, measured_osm_mOsm_kg: 290 };
    const r = f.run(ctx) as any;
    expect(r.value ?? r.calculated_mOsm_kg).toBeCloseTo(290.0, 1);
    const gap = r.notes?.find((n: string)=>/gap/.test(n)) ? 0 : (r.osmolal_gap_mOsm_kg ?? 0);
    // Accept either explicit gap field or note
    if (r.osmolal_gap_mOsm_kg != null) {
      expect(r.osmolal_gap_mOsm_kg).toBeCloseTo(0.0, 1);
    }
  });
});
