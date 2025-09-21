import { describe, expect, it } from "vitest";

import { UNCLEAR_IMAGE_WARNING, normalizeFindings } from "../lib/imaging/findings";
import { applyHandHeuristics } from "../lib/imaging/handHeuristics";

describe("imaging findings normalization", () => {
  it("infers a Boxer’s fracture on single-view output", () => {
    const raw = JSON.stringify({
      fracture_present: true,
      bone: "5th metacarpal",
      region: "neck",
      confidence_0_1: 0.88,
      angulation_deg: 32.4,
      need_additional_views: true,
    });

    const { findings, warning } = normalizeFindings(raw);
    const heuristics = applyHandHeuristics({ ...findings });

    expect(warning).toBeNull();
    expect(heuristics.fracture_present).toBe(true);
    expect(heuristics.need_additional_views).toBe(true);
    expect(heuristics.suspected_type).toBe("Boxer’s fracture");
    expect(heuristics.confidence_0_1).toBeCloseTo(0.88, 2);
  });

  it("keeps multiple-view guidance and cleans arrays", () => {
    const raw = JSON.stringify({
      fracture_present: false,
      confidence_0_1: 0.42,
      need_additional_views: false,
      red_flags: ["Soft tissue swelling", "", "  "],
    });

    const { findings, warning } = normalizeFindings(raw);

    expect(warning).toBeNull();
    expect(findings.fracture_present).toBe(false);
    expect(findings.need_additional_views).toBe(false);
    expect(findings.red_flags).toEqual(["Soft tissue swelling"]);
    expect(findings.confidence_0_1).toBeCloseTo(0.42, 2);
  });

  it("flags corrupted responses for clearer guidance", () => {
    const { findings, warning } = normalizeFindings("{not-json");

    expect(findings.fracture_present).toBeNull();
    expect(warning).toBe(UNCLEAR_IMAGE_WARNING);
  });
});
