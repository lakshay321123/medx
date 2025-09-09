import { describe, it, expect } from "vitest";
import { computeAll } from "../computeAll";

describe("Medical calculators EXT1–50", () => {
  it("computes delta gap correctly", () => {
    const out = computeAll({ anion_gap: 28, HCO3: 12 });
    expect(out.find(o => o.id === "delta_gap")?.value).toBeCloseTo(4, 0);
  });

  it("flags sepsis shock with pressors+lactate>2", () => {
    const out = computeAll({ on_vasopressors: true, lactate: 3.2 });
    const node = out.find(o => o.id === "septic_shock_flag");
    expect(node?.value).toBe(1);
    expect(node?.notes?.[0]).toMatch(/Sepsis-3 shock/);
  });

  it("handles renal gate FEUrea on diuretics", () => {
    const out = computeAll({ FEUrea: 25, on_diuretics: true });
    expect(out.find(o => o.id === "fena_feurea_gate")?.notes?.join(" "))
      .toMatch(/prerenal/);
  });

  it("gives ARDS mild band", () => {
    const out = computeAll({ PaO2: 80, FiO2: 0.3 });
    const pf = out.filter(o => o.id === "pf_ratio").at(-1);
    expect(pf?.notes?.[0]).toMatch(/mild ARDS/);
  });

  it("computes Cockcroft–Gault within expected range", () => {
    const out = computeAll({ age: 60, weight_kg: 70, sex: "M", serum_creatinine: 1.2 });
    const crcl = out.find(o => o.id === "cockcroft_gault")?.value as number;
    expect(crcl).toBeGreaterThan(55);
    expect(crcl).toBeLessThan(65);
  });

  it("corrected calcium adjusts with albumin", () => {
    const out = computeAll({ calcium: 8.4, albumin: 2.4 });
    expect(out.find(o => o.id === "corrected_calcium")?.value).toBeCloseTo(9.7, 1);
  });

  it("returns NIHSS severity band", () => {
    const out = computeAll({ nihss_total: 12 });
    expect(out.find(o => o.id === "nihss_band")?.notes?.[0]).toMatch(/moderate/);
  });

  it("burn Parkland formula matches expected", () => {
    const out = computeAll({ weight_kg: 70, tbsa_percent: 40 });
    expect(out.find(o => o.id === "parkland_formula")?.value).toBe(11200);
  });

  it("BMI categories", () => {
    const out = computeAll({ weight_kg: 92, height_cm: 170 });
    expect(out.find(o => o.id === "bmi_calc")?.notes?.[0]).toMatch(/obese/);
  });

  it("handles Wells PE surrogate high", () => {
    const out = computeAll({ dvt_signs: true, pe_most_likely: true, hr_gt_100: true, immobilization: true, previous_dvt_pe: true, hemoptysis: false, cancer: false });
    expect(out.find(o => o.id === "wells_pe")?.notes?.[0]).toMatch(/high/);
  });

  it("Child-Pugh C classification", () => {
    const out = computeAll({ bilirubin_band: 3, albumin_band: 3, inr_band: 3, ascites_band: 3, encephalopathy_band: 3 });
    expect(out.find(o => o.id === "child_pugh")?.notes?.[0]).toMatch(/Class C/);
  });

  it("NEWS2 surrogate risk", () => {
    const out = computeAll({ RRr: 25, SaO2: 90, on_o2: true, temp_c: 38.5, SBP: 100, HR: 120, conscious_level: "A" });
    expect(out.find(o => o.id === "news2")?.notes?.[0]).toMatch(/high/);
  });

  it("Shock index elevated", () => {
    const out = computeAll({ HR: 150, SBP: 80, age: 4 });
    const node = out.filter(o => o.id === "shock_index").at(-1);
    expect(node?.notes?.join(" ")).toMatch(/elevated SI/);
  });
});

