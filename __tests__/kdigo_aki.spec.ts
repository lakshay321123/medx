import { runKDIGO } from "../lib/medical/engine/calculators/kdigo_aki";

describe("KDIGO AKI staging", () => {
  it("stages by creatinine ratio (stage 3 when ratio ≥ 3.0)", () => {
    const out = runKDIGO({
      creat_mg_dL_current: 3.0,
      creat_mg_dL_baseline: 1.0,
      creat_rise_mg_dL_48h: 0.6
    })!;
    expect(out).not.toBeNull();
    expect(out.KDIGO_stage).toBe(3);
    expect(out.ratio).toBeCloseTo(3.0, 2);
    expect(out.delta48).toBeCloseTo(0.6, 2);
  });

  it("stages by creatinine ratio (stage 2 when 2.0 ≤ ratio < 3.0)", () => {
    const out = runKDIGO({
      creat_mg_dL_current: 2.2,
      creat_mg_dL_baseline: 1.0
    })!;
    expect(out.KDIGO_stage).toBe(2);
  });

  it("uses urine output criteria to escalate stage", () => {
    const out = runKDIGO({
      creat_mg_dL_current: 1.4,
      creat_mg_dL_baseline: 1.0,
      urine_mL_kg_h_24h: 0.25 // <0.3 → stage 3
    })!;
    expect(out.KDIGO_stage).toBe(3);
  });
});
