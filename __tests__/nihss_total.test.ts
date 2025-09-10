import { runNIHSS } from "@/lib/medical/engine/calculators/nihss_total";

test("NIHSS sum and band", () => {
  const r = runNIHSS([1,2,3,4]);
  expect(r.total).toBe(10);
  expect(r.severity).toBe("moderate");
});
