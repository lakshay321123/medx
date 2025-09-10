import { test, expect } from "@jest/globals";
import { runPEWSSimple } from "../lib/medical/engine/calculators/pews_simple";

test("PEWS simple", () => {
  const out = runPEWSSimple({ behavior: "lethargic", cardiovascular: "poor_perfusion", respiratory: "retractions" });
  expect(out.points).toBe(6);
});
