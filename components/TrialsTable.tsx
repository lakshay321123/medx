"use client";

import React from "react";
import type { TrialRow } from "@/types/trials";
import { TrialsRow } from "./TrialsRow";
import { ListenButton } from "@/components/voice/ListenButton";
import { usePrefs } from "@/components/providers/PreferencesProvider";

export default function TrialsTable({ rows }: { rows: TrialRow[] }) {
  if (!rows || rows.length === 0) return null;

  const { lang } = usePrefs();

  const getListenText = React.useCallback((trial: TrialRow) => {
    const title = (trial as any).title_display ?? trial.title ?? "";
    const condition = Array.isArray(trial.conditions) && trial.conditions.length > 0
      ? trial.conditions.filter(Boolean).join(", ")
      : (trial as any).condition || "";
    const phase = trial.phase ? `Phase: ${trial.phase}` : "";
    const status = trial.status ? `Status: ${trial.status}` : "";
    const location = (() => {
      const fromLocations = Array.isArray(trial.locations) && trial.locations.length > 0
        ? trial.locations[0]
        : undefined;
      if (fromLocations) {
        return [fromLocations.facility, fromLocations.city, fromLocations.country]
          .filter(Boolean)
          .join(", ");
      }
      return [trial.site, trial.city, trial.country].filter(Boolean).join(", ");
    })();
    const summary = (trial as any).summary_short || (trial as any).summary || "";

    const bits = [
      title,
      condition ? `Condition: ${condition}` : "",
      phase,
      status,
      location ? `Location: ${location}` : "",
      summary,
    ].filter(Boolean);

    return bits.join(". ");
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Registry ID</th>
            <th className="border px-2 py-1">Title</th>
            <th className="border px-2 py-1">Phase</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Country</th>
          </tr>
        </thead>

        {/* debug: counts per source */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mb-2 text-xs text-slate-500">
            Source counts: {JSON.stringify(
              rows.reduce((m: Record<string, number>, r: any) => {
                const s = (r.source || "unknown").toUpperCase();
                m[s] = (m[s] || 0) + 1;
                return m;
              }, {})
            )}
          </div>
        )}

        <tbody>
          {rows.map((row, i) => {
            const key = `${row.source || "src"}:${row.id || row.url || i}`;
            const listenText = getListenText(row);
            return (
              <TrialsRow
                key={key}
                row={{
                  nctId: row.id || row.url || "",
                  title: row.title,
                  phase: row.phase,
                  status: row.status,
                  country: row.country,
                }}
                listenControl={
                  listenText.trim().length > 0 ? (
                    <ListenButton getText={() => listenText} lang={lang} />
                  ) : null
                }
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
