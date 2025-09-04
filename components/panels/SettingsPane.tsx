"use client";
import { useEffect, useState } from "react";

const KEY = "medx:v1:settings";

export default function SettingsPane() {
  const [process, setProcess] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProcess(!!JSON.parse(raw).processHealthData);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ processHealthData: process }));
    } catch {}
  }, [process]);

  return (
    <div className="p-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={process}
          onChange={(e) => setProcess(e.target.checked)}
        />
        <span>Process my health data</span>
      </label>
    </div>
  );
}
