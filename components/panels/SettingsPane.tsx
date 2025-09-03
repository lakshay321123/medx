"use client";
import { useEffect } from "react";
import { useSettings } from "@/lib/store/settings";

export default function SettingsPane() {
  const { processHealthData, setProcessHealthData, hydrate } = useSettings();
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <div className="p-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={processHealthData}
          onChange={(e) => setProcessHealthData(e.target.checked)}
        />
        <span>Process my health data</span>
      </label>
    </div>
  );
}
