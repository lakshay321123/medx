import { describe, it, expect } from "vitest";
import { detectIntentAndEntities } from "../lib/aidoc/detectIntent";

describe("detectIntent", () => {
  it("pulls reports", () => {
    const r = detectIntentAndEntities("pull my reports");
    expect(r.intent).toBe("pull_reports");
  });

  it("compares a metric", () => {
    const r = detectIntentAndEntities("compare LDL since last visit");
    expect(r.intent).toBe("compare_metric");
    expect(r.entities.metric).toBe("LDL");
  });

  it("compares between dates", () => {
    const r = detectIntentAndEntities("compare 2025-05-01 vs 2025-10-01");
    expect(r.intent).toBe("compare_reports");
    expect(r.entities.compareWindow).toBeTruthy();
  });

  it("health summary", () => {
    const r = detectIntentAndEntities("how is my health overall");
    expect(r.intent).toBe("health_summary");
  });

  it("interpret imaging", () => {
    const r = detectIntentAndEntities("explain my knee x-ray");
    expect(r.intent).toBe("interpret_report");
  });
});
