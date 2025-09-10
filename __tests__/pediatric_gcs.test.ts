import { runPediatricGCS } from "@/lib/medical/engine/calculators/pediatric_gcs";

test("Pediatric GCS", () => {
  const r = runPediatricGCS({ eye:4, verbal:5, motor:6 });
  expect(r.total).toBe(15);
});
