import { runQTc } from "@/lib/medical/engine/calculators/qtc_bazett_framingham";

test("QTc Bazett + Framingham", () => {
  const r = runQTc({ qt_ms:440, hr_bpm:60 });
  // HR 60 => RR = 1, Bazett = QT, Framingham = QT
  expect(r.rr_s).toBeCloseTo(1, 6);
  expect(r.qtc_bazett_ms).toBeCloseTo(440, 2);
  expect(r.qtc_framingham_ms).toBeCloseTo(440, 2);
});
