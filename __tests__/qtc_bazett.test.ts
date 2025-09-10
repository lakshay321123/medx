  import { calc_qtc_bazett } from "../lib/medical/engine/calculators/qtc_bazett";

  describe("calc_qtc_bazett", () => {

it("computes QTc from HR", () => {
  const r = calc_qtc_bazett({ qt_ms: 400, heart_rate_bpm: 60 });
  expect(r.rr_s).toBeCloseTo(1.0, 2);
  expect(r.qtc_ms).toBeCloseTo(400, 0);
});

  });
