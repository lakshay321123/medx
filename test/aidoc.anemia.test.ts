import { describe, it, expect } from "vitest";
import { anemiaRules } from "../lib/aidoc/rules/anemia";

describe("anemiaRules", () => {
  it("detects iron deficiency microcytic anemia", () => {
    const out = anemiaRules({
      labs: [
        { name: "Hb", value: 9, unit: "g/dL" },
        { name: "MCV", value: 70, unit: "fL" },
        { name: "Ferritin", value: 10, unit: "ng/mL" }
      ]
    });
    expect(out.fired).toContain("anemia.microcytic");
    expect(out.steps.some(s => /iron deficiency/i.test(s))).toBe(true);
  });

  it("fires soft alert for severe anemia", () => {
    const out = anemiaRules({ labs: [{ name: "Hemoglobin", value: 6.5, unit: "g/dL" }] });
    expect(out.softAlerts?.length).toBeGreaterThan(0);
  });
});

