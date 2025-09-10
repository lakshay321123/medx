import { test, expect } from "@jest/globals";
import { runECOGFromKarnofsky } from "../lib/medical/engine/calculators/ecog_karnofsky";

test("ECOG from KPS", () => {
  const out = runECOGFromKarnofsky({ karnofsky: 65 });
  expect(out.ecog).toBe(2);
});
