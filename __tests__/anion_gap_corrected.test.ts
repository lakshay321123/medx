import { runAnionGapCorrected } from "@/lib/medical/engine/calculators/anion_gap_corrected";

test("Corrected AG", () => {
  const r = runAnionGapCorrected({ albumin_g_dl:2.0, na:140, cl:100, hco3:24 });
  // AG = 16; correction adds 5
  expect(r.ag).toBe(16);
  expect(r.ag_corrected).toBeCloseTo(21, 2);
});
