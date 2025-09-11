import { calc_qtc_bazett } from "../lib/medical/engine/calculators/qtc_bazett";

describe("calc_qtc_bazett", () => {
  it("qt / sqrt(rr)", () => {
    const v = calc_qtc_bazett({ qt_ms: 400, hr_bpm: 60 });
    expect(v).toBeCloseTo(400/1, 6);
  });
});
