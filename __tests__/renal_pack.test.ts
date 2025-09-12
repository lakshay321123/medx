/**
 * Renal Core Pack: eGFR (CKD-EPI 2021 + Cockcroft-Gault), FeNa, Urine Anion Gap
 */
import { describe, test, expect } from "vitest";
import { all } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

function get(id: string) {
  const f = all().find(f => f.id === id);
  if (!f) throw new Error("Formula not found: " + id);
  return f;
}

describe("eGFR (CKD-EPI 2021 via egfr)", () => {
  function ckdepi21(age:number, sex:"male"|"female", scr:number): number {
    const sexFac = sex==="female";
    const k = sexFac?0.7:0.9;
    const a = sexFac?-0.241:-0.302;
    const min = Math.min(scr/k,1)**a;
    const max = Math.max(scr/k,1)**-1.200;
    const egfr = 142*min*max*(0.9938**age)*(sexFac?1.012:1.0);
    return Number(egfr.toFixed(1));
  }
  test("Male 60y, Scr 1.0 → matches engine", () => {
    const f = get("egfr");
    const ctx = { method: "CKD_EPI_2021", sex: "male", age_years: 60, scr_mg_dL: 1.0 };
    const r = f.run(ctx) as any;
    expect(r?.eGFR_mL_min_1_73m2 ?? r?.value).toBeCloseTo(ckdepi21(60, "male", 1.0), 1);
  });
  test("Female 50y, Scr 0.8 → matches engine", () => {
    const f = get("egfr");
    const ctx = { method: "CKD_EPI_2021", sex: "female", age_years: 50, scr_mg_dL: 0.8 };
    const r = f.run(ctx) as any;
    expect(r?.eGFR_mL_min_1_73m2 ?? r?.value).toBeCloseTo(ckdepi21(50, "female", 0.8), 1);
  });
});

describe("eGFR (Cockcroft-Gault via egfr)", () => {
  function cockcroft(age:number, sex:"male"|"female", weight:number, scr:number): number {
    const sexFac = sex==="female" ? 0.85 : 1.0;
    const crcl = ((140 - age) * weight) / (72 * scr) * sexFac;
    return Number(crcl.toFixed(1));
  }
  test("Male 65y, 80kg, Scr 1.2 → matches engine", () => {
    const f = get("egfr");
    const ctx = { method: "Cockcroft-Gault", sex: "male", age_years: 65, scr_mg_dL: 1.2, weight_kg: 80 };
    const r = f.run(ctx) as any;
    expect(r?.eGFR_mL_min_1_73m2 ?? r?.value).toBeCloseTo(cockcroft(65, "male", 80, 1.2), 1);
  });
  test("Female 70y, 60kg, Scr 1.1 → matches engine (×0.85)", () => {
    const f = get("egfr");
    const ctx = { method: "Cockcroft-Gault", sex: "female", age_years: 70, scr_mg_dL: 1.1, weight_kg: 60 };
    const r = f.run(ctx) as any;
    expect(r?.eGFR_mL_min_1_73m2 ?? r?.value).toBeCloseTo(cockcroft(70, "female", 60, 1.1), 1);
  });
});

describe("FeNa (fractional excretion Na)", () => {
  test("Low FeNa ~0.07% (prerenal-suggested)", () => {
    const f = get("fena");
    const ctx = { urine_na_meq_l: 10, plasma_na_meq_l: 140, urine_cr_mg_dl: 100, plasma_cr_mg_dl: 1.0 };
    const r = f.run(ctx) as any;
    expect(r?.value ?? r?.fena_pct).toBeCloseTo(0.0714, 2);
    const notes = (r?.notes || []).join(" ");
    expect(notes.toLowerCase()).toContain("prerenal");
  });
});

describe("Urine anion gap", () => {
  test("UAG = UNa + UK - UCl", () => {
    const f = get("urine_anion_gap");
    const ctx = { una_mEq_L: 20, uka_mEq_L: 25, ucl_mEq_L: 50 };
    const r = f.run(ctx) as any;
    const uag = 20 + 25 - 50; // -5
    expect(r?.value ?? r?.urine_anion_gap_mEq_L).toBeCloseTo(uag, 1);
  });
});
