/**
 * Cardiology Risk Pack: CHA2DS2-VASc, TIMI (UA/NSTEMI & STEMI), GRACE (scaffold)
 */
import { FORMULAE } from "../lib/medical/engine/registry";

function get(id: string) {
  const f = FORMULAE.find(f => f.id === id);
  if (!f) throw new Error("Formula not found: " + id);
  return f;
}

describe("CHA2DS2-VASc", () => {
  test("Maximal profile → score 9", () => {
    const f = get("cha2ds2_vasc");
    const r = f.run({ age: 78, sex: "female", hx_chf: true, hx_htn: true, hx_dm: true, hx_stroke_tia: true, hx_vascular: true });
    expect(r?.value).toBe(9);
  });

  test("Male 66y, no comorbids → score 1 (age 65–74)", () => {
    const f = get("cha2ds2_vasc");
    const r = f.run({ age: 66, sex: "male" });
    expect(r?.value).toBe(1);
  });
});

describe("TIMI UA/NSTEMI", () => {
  test("All 7 risk features → 7, band high (5–7)", () => {
    const f = get("timi_ua_nstemi");
    const ctx = {
      age_years: 70, risk_factors_count: 3, known_cad_ge50pct: true,
      aspirin_7d: true, severe_angina_24h: true, st_deviation_mm_ge_0_5: true, positive_marker: true
    };
    const r = f.run(ctx) as any;
    expect(r?.TIMI_UA_NSTEMI ?? r?.value).toBe(7);
    expect((r?.risk_band || "").toLowerCase()).toContain("high");
  });

  test("No risk features → 0, band low (0–2)", () => {
    const f = get("timi_ua_nstemi");
    const ctx = {
      age_years: 40, risk_factors_count: 0, known_cad_ge50pct: false,
      aspirin_7d: false, severe_angina_24h: false, st_deviation_mm_ge_0_5: false, positive_marker: false
    };
    const r = f.run(ctx) as any;
    expect(r?.TIMI_UA_NSTEMI ?? r?.value).toBe(0);
    expect((r?.risk_band || "").toLowerCase()).toContain("low");
  });
});

describe("TIMI STEMI (simplified)", () => {
  test("Example profile scoring", () => {
    const f = get("timi_stemi");
    // pts = 2 (age 65–74) + 1 (RF>=3) + 3 (SBP<100) + 2 (HR>100) + 1 (anterior/LBBB) + 1 (time>4h) + 1 (weight<67)
    const r = f.run({
      age_ge75: false, age_65_74: true, risk_factors_ge3: true,
      sbp_lt100: true, hr_gt100: true, anterior_ste_or_lbbb: true,
      time_to_tx_gt4h: true, weight_lt67kg: true
    }) as any;
    expect(r?.TIMI_STEMI ?? r?.value).toBe(2+1+3+2+1+1+1);
  });
});

describe("GRACE surrogate (scaffold)", () => {
  function surrogateLocal(i:{age_years:number,hr_bpm:number,sbp_mmHg:number,creat_mg_dL:number,killip_class:1|2|3|4,st_deviation:boolean,cardiac_arrest_at_admit:boolean,elevated_markers:boolean}) {
    const w = (i.age_years/10) + (i.hr_bpm/50) + ((120 - Math.min(i.sbp_mmHg,120))/20) + (i.creat_mg_dL*2) + (i.killip_class*3) + (i.st_deviation?3:0) + (i.cardiac_arrest_at_admit?5:0) + (i.elevated_markers?2:0);
    return Math.round(w);
  }
  test("Reproduce scaffold surrogate and band", () => {
    const f = get("grace_full_scaffold");
    const ctx = { age_years: 70, hr_bpm: 110, sbp_mmHg: 95, creat_mg_dL: 1.2, killip_class: 2 as 1|2|3|4, st_deviation: true, cardiac_arrest_at_admit: false, elevated_markers: true };
    const r = f.run(ctx) as any;
    const exp = surrogateLocal(ctx);
    expect(r?.GRACE_surrogate).toBe(exp);
    const band = exp < 10 ? "low" : exp < 20 ? "intermediate" : "high";
    expect(r?.risk_band).toBe(band);
  });
});
