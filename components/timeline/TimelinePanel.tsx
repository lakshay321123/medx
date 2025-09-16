// components/timeline/TimelinePanel.tsx
"use client";

import * as React from "react";

type Event = {
  id: string;
  at: string;
  kind: string;
  value?: string | number;
  units?: string;
  source?: string | null;
};

function groupByDate(evts: Event[]) {
  const map = new Map<string, Event[]>();
  for (const e of evts) {
    const d = new Date(e.at);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  // sort days desc
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
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
          setEvents(j.events || []);
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

  return (
    <div className="space-y-6">
      {days.map(([day, rows]) => (
        <div key={day} className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">{day}</div>
          <div className="divide-y rounded-xl bg-white/60 shadow-sm ring-1 ring-black/5">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3">
                <div className="flex min-w-0 flex-col">
                  <div className="truncate font-medium">{e.kind}</div>
                  {e.source ? (
                    <div className="truncate text-xs text-muted-foreground">thread: {e.source}</div>
                  ) : null}
                </div>
                <div className="pl-3 text-right tabular-nums">
                  {e.value !== undefined ? (
                    <span className="font-medium">
                      {e.value}
                      {e.units ? ` ${e.units}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
