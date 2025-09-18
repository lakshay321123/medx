import { describe, expect, test } from "vitest";
import { doctorPatientFromSnapshot } from "../lib/aidoc/context";
import type { PatientSnapshot } from "../lib/patient/snapshot";

describe("doctorPatientFromSnapshot", () => {
  test("collects labs, meds, diagnoses, and allergies from Supabase snapshot", () => {
    const snapshot: PatientSnapshot = {
      profile: {
        name: "Rohan",
        dob: null,
        age: 45,
        sex: "male",
        blood_group: null,
        chronic_conditions: ["Type 1 diabetes"],
        conditions_predisposition: ["Hypothyroidism"],
      },
      observations: [],
      highlights: [],
      rawObservations: [
        {
          kind: "lab",
          name: "Na⁺",
          value_text: "134",
          unit: "mmol/L",
          observed_at: "2024-03-01T00:00:00Z",
        },
        {
          kind: "lab",
          name: "HCO₃⁻",
          value_text: "10",
          unit: "mmol/L",
          observed_at: "2024-03-01T00:00:00Z",
        },
        {
          kind: "medication",
          name: "Metformin",
          value_text: "500 mg PO BID",
          observed_at: "2024-02-20T00:00:00Z",
        },
        {
          kind: "allergy",
          name: "Penicillin",
          value_text: "rash",
          observed_at: "2024-02-18T00:00:00Z",
        },
        {
          kind: "diagnosis",
          name: "DKA",
          observed_at: "2024-03-03T00:00:00Z",
        },
      ],
    };

    const patient = doctorPatientFromSnapshot(snapshot);

    expect(patient.name).toBe("Rohan");
    expect(patient.age).toBe(45);
    expect(patient.sex).toBe("male");
    expect(patient.encounterDate).toBe("2024-03-03");

    expect(patient.diagnoses).toContain("DKA");
    expect(patient.diagnoses).toContain("Type 1 diabetes");
    expect(patient.comorbidities).toContain("Type 1 diabetes");
    expect(patient.comorbidities).toContain("Family history: Hypothyroidism");

    const sodium = patient.labs?.find((l) => l.name === "Na⁺");
    expect(sodium?.value).toBe(134);
    expect(sodium?.unit).toBe("mmol/L");

    expect(patient.meds).toContain("Metformin — 500 mg PO BID");
    expect(patient.allergies).toContain("Penicillin — rash");
  });
});
