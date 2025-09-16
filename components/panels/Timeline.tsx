"use client";

import TimelinePanel from "@/components/timeline/TimelinePanel";

export default function Timeline() {
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Recent prediction and observation events for this patient.
        </p>
      </div>
      <TimelinePanel />
    </div>
  );
}
