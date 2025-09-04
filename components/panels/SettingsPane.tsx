"use client";
import { useAppState } from "@/lib/context/AppState";

export default function SettingsPane() {
  const { state, dispatch } = useAppState();
  return (
    <div className="p-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={state.settings.processHealthData}
          onChange={(e) =>
            dispatch({ type: "SET_PROCESS_HEALTH", value: e.target.checked })
          }
        />
        <span>Process my health data</span>
      </label>
    </div>
  );
}
