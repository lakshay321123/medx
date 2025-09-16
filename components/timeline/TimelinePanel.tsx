"use client";

import * as React from "react";

type Event = {
  id: string;
  type: "prediction" | "observation";
  label: string;
  timestamp: string;
  value?: string | number | null;
  unit?: string | null;
  detail?: string | null;
  source?: string | null;
};

function groupByDate(evts: Event[]) {
  const map = new Map<string, Event[]>();
  for (const e of evts) {
    const d = new Date(e.timestamp);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  // sort days desc
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, rows]) => [
      day,
      rows.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    ]) as Array<[string, Event[]]>;
}

export default function TimelinePanel({ patientId }: { patientId?: string }) {
  const [events, setEvents] = React.useState<Event[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = () => {
      const url = patientId
        ? `/api/timeline?patientId=${encodeURIComponent(patientId)}`
        : `/api/timeline`;
      fetch(url, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          if (j?.error) throw new Error(j.error);
          const payload = Array.isArray(j.events) ? (j.events as Event[]) : [];
          setEvents(payload);
          setErr(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setErr(e.message || "Failed to load");
        });
    };

    load();
    const handler = () => load();
    window.addEventListener("timeline-updated", handler);

    return () => {
      cancelled = true;
      window.removeEventListener("timeline-updated", handler);
    };
  }, [patientId]);

  if (err) return <div className="text-sm text-red-600">Error: {err}</div>;
  if (!events) return <div className="text-sm text-muted-foreground">Loading timeline…</div>;
  if (events.length === 0) return <div className="text-sm">No events yet.</div>;

  const days = groupByDate(events);

  const badgeClass = (type: Event["type"]) => {
    if (type === "prediction") return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30";
    return "bg-slate-500/10 text-slate-600 border-slate-500/20";
  };

  const formatValue = (value: Event["value"], unit: Event["unit"]) => {
    if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
    if (typeof value === "number") {
      const text = Number.isFinite(value) ? value.toString() : String(value);
      return (
        <span className="font-medium">
          {text}
          {unit ? ` ${unit}` : ""}
        </span>
      );
    }
    return (
      <span className="font-medium">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {days.map(([day, rows]) => (
        <div key={day} className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">{day}</div>
          <div className="divide-y rounded-xl bg-white/60 shadow-sm ring-1 ring-black/5">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass(e.type)}`}>
                      {e.type === "prediction" ? "Prediction" : "Observation"}
                    </span>
                    <span className="truncate font-medium">{e.label}</span>
                  </div>
                  {e.detail ? (
                    <div className="truncate text-xs text-muted-foreground">{e.detail}</div>
                  ) : null}
                  {e.source ? (
                    <div className="truncate text-xs text-muted-foreground">{e.source}</div>
                  ) : null}
                </div>
                <div className="pl-3 text-right tabular-nums">
                  {formatValue(e.value ?? null, e.unit ?? null)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
