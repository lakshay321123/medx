import { describe, it, expect } from "vitest";
import { thyroidRules } from "../lib/aidoc/rules/thyroid";

describe("thyroidRules", () => {
  it("fires overt hypothyroid when TSH >= 10", () => {
    const out = thyroidRules({
      labs: [{ name: "TSH", value: 12.3, unit: "mIU/L" }]
    });
    expect(out.fired).toContain("thyroid.overt_hypothyroid");
    expect(out.steps.length).toBeGreaterThan(0);
  });

  it("fires overt hyperthyroid when TSH < 0.1 with high FT4", () => {
    const out = thyroidRules({
      labs: [
        { name: "TSH", value: 0.03, unit: "mIU/L" },
        { name: "Free T4", value: 2.2, unit: "ng/dL" }
      ]
    });
    expect(out.fired).toContain("thyroid.overt_hyperthyroid");
  });

  it("adds pregnancy soft alert if abnormal and pregnant", () => {
    const out = thyroidRules({
      profile: { pregnant: true },
      labs: [{ name: "TSH", value: 11.1 }]
    });
    expect(out.softAlerts.some((s) => /Pregnancy/i.test(s))).toBe(true);
  });
});

