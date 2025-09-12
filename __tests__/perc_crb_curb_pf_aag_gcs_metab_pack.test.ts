/**
 * Tests for the new calculator bundle.
 */
import { describe, test, expect } from "vitest";
import { all } from "../lib/medical/engine/registry";
import "../lib/medical/engine/calculators";

function get(id: string) {
  const f = all().find(f => f.id === id);
  if (!f) throw new Error("Formula not found: " + id);
  return f;
}

describe("PERC rule", () => {
  test("All 8 pass -> value 'pass'", () => {
    const f = get("perc_rule");
    const r = f.run({
      age_lt50: true, hr_lt100: true, spo2_ge95: true, no_hemoptysis: true,
      no_estrogen: true, no_prior_dvt_pe: true, no_unilateral_leg_swelling: true, no_recent_surgery_trauma: true
    }) as any;
    expect(r?.value).toBe("pass");
  });
  test("Fail one -> value 'fail'", () => {
    const f = get("perc_rule");
    const r = f.run({
      age_lt50: true, hr_lt100: false, spo2_ge95: true, no_hemoptysis: true,
      no_estrogen: true, no_prior_dvt_pe: true, no_unilateral_leg_swelling: true, no_recent_surgery_trauma: true
    }) as any;
    expect(r?.value).toBe("fail");
  });
});

describe("CRB-65 & CURB-65", () => {
  test("CRB-65 example 3 -> high", () => {
    const f = get("crb65");
    const r = f.run({ confusion: true, rr_ge30: true, low_bp: false, age_ge65: true }) as any;
    expect(r?.value).toBe(3);
    expect((r?.notes||[]).join(' ').toLowerCase()).toContain('high');
  });
  test("CURB-65 with BUN>19 adds U point", () => {
    const f = get("curb65");
    const r = f.run({ confusion:false, bun_mg_dl: 25, rr_ge30: true, low_bp: false, age_ge65: false }) as any;
    expect(r?.value).toBe(2);
  });
});

describe("A–a gradient + PAO2 + S/F", () => {
  test("PAO2 calculation", () => {
    const f = get("pao2_alveolar");
    const r = f.run({ FiO2: 0.21, PaCO2: 40 }) as any;
    expect(typeof r?.value).toBe("number");
  });
  test("A–a gradient from ABG", () => {
    const f = get("a_a_gradient");
    const r = f.run({ PaO2: 80, FiO2: 0.21, PaCO2: 40, age_years: 40 }) as any;
    expect(typeof r?.value).toBe("number");
    expect((r?.notes||[]).join(' ').toLowerCase()).toContain('pao2');
  });
  test("S/F ratio", () => {
    const f = get("sf_ratio");
    const r = f.run({ SpO2_pct: 96, FiO2: 0.32 }) as any; // 300
    expect(r?.value).toBeCloseTo(300, 0);
  });
});

describe("Electrolyte & water tools", () => {
  test("Corrected Na (hyperglycemia)", () => {
    const f = get("corrected_na_glucose");
    const r = f.run({ Na_meq_l: 130, glucose_mg_dl: 500 }) as any;
    // +1.6 per 100 over 100 => +6.4 => 136.4
    expect(r?.value).toBeCloseTo(136.4, 1);
  });
  test("Free water deficit", () => {
    const f = get("free_water_deficit");
    const r = f.run({ sex: "male", weight_kg: 70, Na_meq_l: 160, target_na: 140 }) as any;
    // TBW=42; deficit=42*(160/140-1)=42*(0.142857)=6 L approx
    expect(r?.value).toBeCloseTo(6.0, 1);
  });
});

describe("Neurology", () => {
  test("GCS 4+5+6 = 15 (mild)", () => {
    const f = get("gcs_total");
    const r = f.run({ eye:4, verbal:5, motor:6 }) as any;
    expect(r?.value).toBe(15);
    expect((r?.notes||[]).join(' ').toLowerCase()).toContain('mild');
  });
});

describe("Body size tools", () => {
  test("IBW Devine (male 180cm)", () => {
    const f = get("ibw_devine");
    const r = f.run({ sex:"male", height_cm: 180 }) as any;
    // 180 cm = 70.87 in => 50 + 2.3*(10.87)=50+25.0 ≈ 75.0 kg
    expect(r?.value).toBeCloseTo(75.0, 0);
  });
  test("Adjusted BW from IBW", () => {
    const f = get("abw_adjusted");
    const r = f.run({ actual_kg: 110, ibw_kg: 75, factor: 0.4 }) as any;
    // 75 + 0.4*(35)=89
    expect(r?.value).toBeCloseTo(89.0, 1);
  });
  test("BSA DuBois", () => {
    const f = get("bsa_dubois");
    const r = f.run({ weight_kg: 80, height_cm: 180 }) as any;
    expect(r?.value).toBeGreaterThan(1.8);
    expect(r?.value).toBeLessThan(2.2);
  });
});
