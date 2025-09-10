import { runQTcFridericia } from "@/lib/medical/engine/calculators/qtc_fridericia";

test("QTc Fridericia", () => {
  const r = runQTcFridericia({ qt_ms:440, hr_bpm:60 });
  expect(r.rr_s).toBeCloseTo(1, 6);
  expect(r.qtc_fridericia_ms).toBeCloseTo(440, 2);
});
