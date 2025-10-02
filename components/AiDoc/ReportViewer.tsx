// components/AiDoc/ReportViewer.tsx
import React from "react";

type Lab = {
  name: string;
  value: number | string | null;
  unit?: string;
  marker?: string;
  ideal?: string;
};

type Report = {
  date: string;
  labs: Lab[];
  summary: string;
};

type Patient = {
  name?: string;
  age?: number;
  predispositions?: string[];
  medications?: string[];
  symptoms?: string[];
};

type Payload = {
  patient?: Patient | null;
  reports: Report[];
  comparisons?: Record<string, string> | null;
  summary?: string | null;
  nextSteps?: string[] | null;
};

export default function ReportViewer({ data }: { data: Payload }) {
  const { patient, reports, comparisons, summary, nextSteps } = data;
  const safeComparisons = comparisons && Object.keys(comparisons).length > 0 ? comparisons : null;
  const safeNextSteps = Array.isArray(nextSteps) ? nextSteps.filter(Boolean) : [];
  const safeSummary = typeof summary === "string" ? summary.trim() : "";

  return (
    <div className="space-y-4">
      {patient && (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Patient</div>
          <div className="text-sm space-y-1">
            {patient.name ? <div>Name: {patient.name}</div> : null}
            {typeof patient.age === "number" ? <div>Age: {patient.age}</div> : null}
            {patient.predispositions?.length ? (
              <div>Predispositions: {patient.predispositions.join(", ")}</div>
            ) : null}
            {patient.medications?.length ? <div>Medications: {patient.medications.join(", ")}</div> : null}
            {patient.symptoms?.length ? <div>Symptoms: {patient.symptoms.join(", ")}</div> : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Report Timeline</div>
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.date} className="rounded-xl bg-muted/40 p-3">
              <div className="text-sm font-medium mb-1">Report Dated — {report.date}</div>
              <ul className="text-sm leading-6">
                {report.labs.map((lab, index) => (
                  <li key={`${report.date}-${index}`}>
                    {lab.name}: {lab.value ?? "—"}
                    {lab.unit ? ` ${lab.unit}` : ""}
                    {lab.marker ? ` — ${lab.marker}` : ""}
                    {lab.ideal ? ` — Ideal ${lab.ideal}` : ""}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-muted-foreground mt-1">Summary: {report.summary}</div>
            </div>
          ))}
        </div>
      </div>

      {safeComparisons && (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Comparisons</div>
          <ul className="text-sm leading-6">
            {Object.entries(safeComparisons).map(([key, value]) => (
              <li key={key}>
                {key}: {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {safeSummary ? (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">AI Clinical Summary</div>
          <p className="text-sm leading-6">{safeSummary}</p>
        </div>
      ) : null}

      {safeNextSteps.length > 0 && (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Next Steps</div>
          <ul className="list-disc ml-5 text-sm leading-6">
            {safeNextSteps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
