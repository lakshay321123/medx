import { describe, it, expect } from "vitest";
import { runCalcAuthoritative } from "../lib/medical/engine/verification/authoritativeRunner";

describe("authoritative calculators (zero tolerance)", () => {
  it("anion gap exact", async () => {
    const { final } = await runCalcAuthoritative("anion_gap", { Na: 140, Cl: 100, HCO3: 24 });
    expect(final).toBe(16);
  });

  it("serum osmolality with mmol/L glucose", async () => {
    const { final } = await runCalcAuthoritative("serum_osmolality", { Na: 134, glucose_mmol_l: 12.2, BUN_mgdl: 40 });
    // 2*134 + 12.2 + 40/2.8 = 268 + 12.2 + 14.2857 = 294.4857
    expect(Number(final.toFixed(2))).toBeCloseTo(294.49, 2);
  });
});
