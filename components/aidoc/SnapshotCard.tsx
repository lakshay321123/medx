import React from "react";

export type SnapshotHighlight = { name: string; value: number | string | null; unit: string | null; status: string };
export type SnapshotReport = { date: string; highlights: SnapshotHighlight[]; mini_summary: string };

export type SnapshotPayload = {
  type: "patient_snapshot";
  summary_tagline: string;
  reports: SnapshotReport[];
  domains: { domain: string; status: string; trend: string }[];
  ai_prediction: { concise: string; confidence: string };
  next_steps: string[];
  safety: string[];
  provenance?: { sources?: string[] };
};

export type MetricComparePayload = {
  type: "metric_compare";
  metric: string;
  series: { date: string; value: number | null; unit: string | null; status: string }[];
  trend: string;
  interpretation: string;
  actions: string[];
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
  }

  return String(value);
}

export function SnapshotCard({ payload }: { payload: SnapshotPayload }) {
  const reports = Array.isArray(payload.reports) ? payload.reports : [];
  const domains = Array.isArray(payload.domains) ? payload.domains : [];
  const nextSteps = Array.isArray(payload.next_steps) ? payload.next_steps : [];
  const safety = Array.isArray(payload.safety) ? payload.safety : [];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Patient Snapshot</div>
          <div className="text-sm text-muted-foreground">{payload.summary_tagline || "No summary available."}</div>
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {payload.ai_prediction?.confidence || "low"} confidence
        </div>
      </div>

      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <div key={`${report.date}-${idx}`} className="rounded-md border border-border bg-card p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{report.date}</div>
              {report.mini_summary && (
                <div className="mt-1 text-sm text-foreground">{report.mini_summary}</div>
              )}
              {report.highlights?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.highlights.slice(0, 6).map((highlight, hIdx) => {
                    const unit = highlight.unit ? ` ${highlight.unit}` : "";
                    const value = formatValue(highlight.value);
                    return (
                      <Pill key={`${report.date}-${hIdx}`}>
                        {highlight.name}: {value}
                        {unit} ({highlight.status || "unknown"})
                      </Pill>
                    );
                  })}
                  {report.highlights.length > 6 ? (
                    <Pill>+{report.highlights.length - 6} more</Pill>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
          No lab values found yet.
        </div>
      )}

      {domains.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {domains.map((domain, idx) => (
            <Pill key={`${domain.domain}-${idx}`}>
              {domain.domain}: {domain.status || "unknown"}
            </Pill>
          ))}
        </div>
      ) : null}

      {payload.ai_prediction?.concise ? (
        <div className="text-sm text-foreground">
          <strong>AI prediction:</strong> {payload.ai_prediction.concise}
        </div>
      ) : null}

      {nextSteps.length > 0 ? (
        <div className="text-sm text-foreground">
          <strong>What to do next:</strong>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {nextSteps.map((step, idx) => (
              <li key={`next-${idx}`}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {safety.length > 0 ? (
        <div className="text-sm text-foreground">
          <strong>Safety net:</strong>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {safety.map((item, idx) => (
              <li key={`safety-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MetricCompareCard({ payload }: { payload: MetricComparePayload }) {
  const series = Array.isArray(payload.series) ? payload.series : [];
  const actions = Array.isArray(payload.actions) ? payload.actions : [];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{payload.metric}</div>
          <div className="text-sm text-muted-foreground">{payload.interpretation}</div>
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{payload.trend}</div>
      </div>

      {series.length > 0 ? (
        <div className="space-y-2 text-sm text-foreground">
          {series.map((point, idx) => {
            const unit = point.unit ? ` ${point.unit}` : "";
            const value = formatValue(point.value);
            return (
              <div key={`${point.date}-${idx}`} className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{point.date}</div>
                <div>
                  {value}
                  {unit} <span className="text-xs text-muted-foreground">({point.status || "unknown"})</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card p-3 text-sm text-muted-foreground">
          No data available yet.
        </div>
      )}

      {actions.length > 0 ? (
        <div className="text-sm text-foreground">
          <strong>Next steps:</strong>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {actions.map((action, idx) => (
              <li key={`action-${idx}`}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
