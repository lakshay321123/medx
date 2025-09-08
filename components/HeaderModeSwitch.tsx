"use client";
import { useMode } from "@/lib/state/mode";

export default function HeaderModeSwitch() {
  const { mode, researchEnabled, setMode, setResearch } = useMode();

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-lg border overflow-hidden">
        <button
          className={`px-3 py-1 text-sm ${mode === "patient" ? "bg-gray-900 text-white" : "bg-white"}`}
          onClick={() => setMode("patient")}
        >Patient</button>
        <button
          className={`px-3 py-1 text-sm ${mode === "doctor" ? "bg-gray-900 text-white" : "bg-white"}`}
          onClick={() => setMode("doctor")}
        >Doctor</button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={researchEnabled}
          onChange={(e) => setResearch(e.target.checked)}
        />
        <span>{mode === "patient" ? "Patient + Research" : "Doctor + Research"}</span>
      </label>
    </div>
  );
}
