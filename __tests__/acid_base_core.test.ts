/**
 * Targeted math tests for core acid-base utilities.
 */
import { describe, test, expect } from "vitest";
import { all } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

function get(id: string) {
  const f = all().find(f => f.id === id);
  if (!f) throw new Error("Formula not found: " + id);
  return f;
}

describe("Acid-base core calculators", () => {
  test("Anion gap basic example (Na 140, Cl 104, HCO3 24) → 12", () => {
    const f = get("anion_gap");
    const r = f.run({ Na: 140, Cl: 104, HCO3: 24 });
    expect(r && typeof r.value === "number" ? r.value : (r as any).ag).toBe(12);
  });

  test("Albumin-corrected AG (AG 12, albumin 2.0) → 17.0", () => {
    const f = get("anion_gap_albumin_corrected");
    const r = f.run({ AG: 12, albumin_g_dL: 2.0 });
    const val = (r as any).value ?? (r as any).ag_corrected;
    expect(val).toBeCloseTo(17.0, 1);
  });

  test("Winter's expected PaCO2 (HCO3 12) → 26 ± 2", () => {
    const f = get("winters_expected_paco2");
    const r = f.run({ HCO3: 12 }) as any;
    const expected = 1.5*12 + 8; // 26
    const got = r?.expected_PaCO2_mmHg ?? r?.value;
    expect(got).toBeCloseTo(expected, 0);
    const range = r?.range_PaCO2_mmHg;
    if (range) {
      expect(range[0]).toBeCloseTo(expected-2, 0);
      expect(range[1]).toBeCloseTo(expected+2, 0);
    }
  });
});
