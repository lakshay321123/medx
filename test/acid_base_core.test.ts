import { describe, it, expect } from "vitest";
import { computeAll } from "../lib/medical/engine/computeAll";

describe("canonical acid–base + osm", () => {
  it("matches canonical numbers for the sample case", () => {
    const ctx = {
      Na: 128, K: 5.5, Cl: 90, HCO3: 10,
      glucose_mgdl: 560, BUN: 28, albumin: 3.8,
      pH: 7.28, pCO2: 20, measured_osm: 320,
    };
    const results = computeAll(ctx);
    const byId = Object.fromEntries(results.map(r => [r.id, r]));

    expect(byId["anion_gap"]?.value).toBeCloseTo(28.0, 1);
    expect(byId["anion_gap_corrected"]?.value).toBeCloseTo(28.5, 1);
    expect(byId["winters_expected_paco2"]?.value).toBeCloseTo(23.0, 1);
    expect(byId["serum_osmolality"]?.value).toBeCloseTo(297, 0);
    expect(byId["effective_osmolality"]?.value).toBeGreaterThanOrEqual(287);
    expect(byId["osmolal_gap"]?.value).toBeCloseTo(23, 0);
    expect(byId["dka_flag"]?.value).toBe(1);
    expect(byId["hhs_flag"]?.value).toBe(0);
  });
});

