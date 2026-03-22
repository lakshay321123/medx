"use client";

import React from "react";
import type { TrialRow } from "@/types/trials";
import { TrialsRow } from "./TrialsRow";

export default function TrialsTable({ rows }: { rows: TrialRow[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const key = `${row.source || "src"}:${row.id || row.url || i}`;
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
          />
        );
      })}
    </div>
  );
}
