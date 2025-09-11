import { calc_qtc_bazett } from "../lib/medical/engine/calculators/qtc_bazett";

describe("calc_qtc_bazett", () => {
  it("applies QT/√RR", () => {
    const v = calc_qtc_bazett({ qt_ms: 400, hr_bpm: 60 });
    expect(v).toBeCloseTo(400/Math.sqrt(1), 6);
  });
});
