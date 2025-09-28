"use client";

const connectors = [
  { name: "Fitbit", description: "Sync activity and heart rate data." },
  { name: "Apple Health", description: "Import workouts, vitals, and labs." },
  { name: "Google Fit", description: "Connect wellness metrics from Android." },
];

export default function ConnectorsPanel() {
  return (
    <div className="flex flex-col divide-y divide-neutral-800/70">
      {connectors.map((connector) => (
        <div key={connector.name} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{connector.name}</p>
            <p className="text-xs text-neutral-400">{connector.description}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}
