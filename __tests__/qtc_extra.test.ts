
import { qtcHodges, qtcFramingham } from "../lib/medical/engine/calculators/qtc_extra";

test("QTc formulas produce sensible outputs", () => {
  const hodges = qtcHodges({ qt_ms: 420, hr_bpm: 90 });
  expect(hodges).toBeGreaterThan(420);
  const frame = qtcFramingham({ qt_ms: 420, hr_bpm: 90 });
  expect(frame).toBeGreaterThan(420);
});
