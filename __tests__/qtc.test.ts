import { calc_qtc } from "../lib/medical/engine/calculators/qtc";

describe("calc_qtc", () => {
  it("computes Bazett and Fridericia", () => {
    const r = calc_qtc({ qt_ms: 400, heart_rate_bpm: 60 });
    // RR = 1.0
    expect(r.bazett).toBeCloseTo(400, 2);
    expect(r.fridericia).toBeCloseTo(400, 2);
  });
});
