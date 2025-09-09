import { redflagChecks } from "../lib/aidoc/rules/redflags";
import { expect, test } from "vitest";

test("redflags: vitals", () => {
  const out = redflagChecks({ vitals: { sbp: 85, hr: 130, spo2: 91, temp: 39.5 } });
  expect(out.length).toBeGreaterThan(0);
});
