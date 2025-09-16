import { test } from "node:test";
import assert from "node:assert";
import { computeDomainResults } from "@/lib/aidoc/risk/domain";
import type { PatientDataset } from "@/lib/aidoc/risk/types";

function iso(str: string) {
  return new Date(str).toISOString();
}

test("longitudinal domain scores reflect history", () => {
  const dataset: PatientDataset = {
    patient: { id: "p1", user_id: "u1", dob: "1980-01-01", sex: "female", name: "Test" },
    vitals: [
      {
        patient_id: "p1",
        taken_at: iso("2025-01-01T08:00:00Z"),
        sbp: 150,
        dbp: 90,
        hr: 78,
        temp: 36.7,
        temp_unit: "C",
        spo2: 98,
        weight_kg: 90,
        height_cm: 165,
        bmi: null,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-10-01T08:00:00Z"),
        sbp: 142,
        dbp: 88,
        hr: 80,
        temp: 36.5,
        temp_unit: "C",
        spo2: 97,
        weight_kg: 89,
        height_cm: 165,
        bmi: null,
      },
    ],
    labs: [
      {
        patient_id: "p1",
        taken_at: iso("2025-01-01T07:00:00Z"),
        test_code: "LDL",
        value: 160,
        unit: "mg/dL",
        ref_low: 0,
        ref_high: 130,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-12-01T07:00:00Z"),
        test_code: "HBA1C",
        value: 8.2,
        unit: "%",
        ref_low: 4,
        ref_high: 6,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-12-15T07:00:00Z"),
        test_code: "GLUCOSE",
        value: 186,
        unit: "mg/dL",
        ref_low: 70,
        ref_high: 110,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-12-20T07:00:00Z"),
        test_code: "TG",
        value: 320,
        unit: "mg/dL",
        ref_low: 30,
        ref_high: 150,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-12-18T07:00:00Z"),
        test_code: "CREAT",
        value: 1.8,
        unit: "mg/dL",
        ref_low: 0.6,
        ref_high: 1.2,
      },
      {
        patient_id: "p1",
        taken_at: iso("2024-12-18T07:10:00Z"),
        test_code: "EGFR",
        value: 45,
        unit: "mL/min/1.73m²",
        ref_low: 60,
        ref_high: 120,
      },
    ],
    medications: [],
    encounters: [],
    notes: [
      {
        patient_id: "p1",
        created_at: iso("2025-01-02T09:00:00Z"),
        text: "Current smoker",
        tags: ["smoking"],
      },
    ],
  };

  const { domains, features } = computeDomainResults(dataset, new Date("2025-01-02T10:00:00Z"));

  const cardio = domains.find(d => d.condition === "Cardiovascular");
  const metabolic = domains.find(d => d.condition === "Metabolic");
  const renal = domains.find(d => d.condition === "Renal");

  assert(cardio, "cardiovascular domain missing");
  assert(metabolic, "metabolic domain missing");
  assert(renal, "renal domain missing");

  assert.equal(cardio!.riskLabel, "High");
  assert.equal(metabolic!.riskLabel, "High");
  assert.equal(renal!.riskLabel, "Moderate");

  assert.ok(features.metrics.ldl?.latest);
  assert.ok(features.metrics.sbp?.latest);
  assert.ok(features.metrics.hba1c?.latest);
  assert.ok(features.metrics.egfr?.latest);
  assert(Math.abs((features.metrics.ldl?.latest?.value ?? 0) - 160) < 0.5);
  assert(Math.abs((features.metrics.egfr?.latest?.value ?? 0) - 45) < 0.5);
});
