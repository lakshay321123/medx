import { describe, it, expect } from "vitest";
import { canonicalizeInputs } from "../lib/medical/engine/extract";
import { computeAll } from "../lib/medical/engine/computeAll";

function byId(res: any[]) { return Object.fromEntries(res.map(r => [r.id, r])); }

describe("canonicalizes aliases and units", () => {
  it("maps measured_osm & SpO2 aliases and converts units", () => {
    const raw = {
      sodium: 134, cl_mmol_l: 98, hco3_mmol_l: 10,
      glucose_mmol_l: 12.2,
      bun_mg_dl: 40, albumin_g_dl: 2.5,
      measured_osm: 310, temp_f: 100.4, SpO2: 92
    } as any;
    const ctx = canonicalizeInputs(raw);
    expect(ctx.Na).toBe(134);
    expect(ctx.Cl).toBe(98);
    expect(ctx.HCO3).toBe(10);
    expect(ctx.glucose_mgdl).toBeCloseTo(219.6, 1);
    expect(ctx.Osm_measured).toBe(310);
    expect(ctx.temp_c).toBeCloseTo(38.0, 1);
    expect(ctx.spo2_percent).toBe(92);
    expect(ctx.SpO2).toBe(92);
    expect(ctx.spo2).toBe(92);

    const r = byId(computeAll(ctx));
    expect(r["serum_osmolality"].value).toBeGreaterThan(280);
    expect(r["osmolal_gap"].value).toBeDefined();
  });
});
