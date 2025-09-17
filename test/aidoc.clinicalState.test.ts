import { describe, expect, it } from "vitest";

import { buildClinicalState, mergeProfileConditions } from "../lib/aidoc/clinicalState";
import { buildAiDocPrompt } from "../lib/ai/prompts/aidoc";

describe("AI Doc clinical state helpers", () => {
  it("extracts labs, medications, and conditions from timeline observations", () => {
    const observations = [
      {
        kind: "labs.hba1c",
        observed_at: "2024-05-01T10:00:00.000Z",
        value_num: null,
        value_text: "8.2",
        unit: "%",
        meta: { category: "labs", label: "HbA1c" },
      },
      {
        kind: "rx.metformin",
        observed_at: "2024-04-15T09:00:00.000Z",
        meta: { category: "meds", label: "Metformin", dose: "500 mg BID" },
      },
      {
        kind: "dx.hypertension",
        observed_at: "2024-03-20T08:00:00.000Z",
        meta: { category: "diagnoses", label: "Hypertension" },
      },
    ];

    const state = buildClinicalState(observations as any, []);

    expect(state.labs.map((l) => l.name)).toContain("HbA1c");
    expect(state.meds[0]).toMatchObject({ name: "Metformin", dose: "500 mg BID" });
    expect(state.conditions.map((c) => c.label)).toContain("Hypertension");
  });

  it("merges chronic and family history conditions", () => {
    const state = {
      labs: [],
      meds: [],
      conditions: [
        {
          label: "Type 2 Diabetes",
          status: "active",
          code: null,
          since: "2024-01-01T00:00:00.000Z",
        },
      ],
      vitals: {},
    };

    mergeProfileConditions(state as any, ["Hypertension"], ["Breast cancer"]);

    expect(state.conditions.find((c: any) => c.label === "Hypertension")?.status).toBe(
      "active",
    );
    expect(state.conditions.find((c: any) => c.label === "Breast cancer")?.status).toBe(
      "family",
    );
  });

  it("includes family history in the AI Doc prompt", () => {
    const prompt = buildAiDocPrompt({
      profile: { name: "Test", age: 55, sex: "female", pregnant: "no" },
      labs: [],
      meds: [],
      conditions: [
        { label: "Hypertension", status: "active" },
        { label: "Breast cancer", status: "family" },
      ],
    });

    expect(prompt).toContain("Active Conditions: Hypertension");
    expect(prompt).toContain("Family History: Breast cancer");
  });
});
