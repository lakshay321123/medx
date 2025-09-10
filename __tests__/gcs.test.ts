import { test, expect } from "@jest/globals";
import { runGCS } from "../lib/medical/engine/calculators/gcs";

test("GCS", () => {
  const out = runGCS({ eye: 2, verbal: 2, motor: 4 });
  expect(out.total).toBe(8);
  expect(out.severity).toBe("severe");
});
