import { runQTcHodges, runQTcFramingham } from "../lib/medical/engine/calculators/qtc_extra";

test("QTc formulas", ()=>{ const h=runQTcHodges({qt_ms:420,hr_bpm:80})!; const f=runQTcFramingham({qt_ms:420,hr_bpm:80})!; expect(h.QTc_Hodges_ms).toBeGreaterThan(420); expect(f.QTc_Framingham_ms).toBeGreaterThan(420); });
