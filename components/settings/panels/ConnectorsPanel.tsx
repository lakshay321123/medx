"use client";

const connectors = [
  { name: "Fitbit", description: "Sync activity and heart rate data." },
  { name: "Apple Health", description: "Import workouts, vitals, and labs." },
  { name: "Google Fit", description: "Connect wellness metrics from Android." },
];

export default function ConnectorsPanel() {
  return (
    <div className="flex flex-col divide-y divide-slate-200 dark:divide-neutral-800">
      {connectors.map((connector) => (
        <div key={connector.name} className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{connector.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{connector.description}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
          >
            Connect
          </button>
        </div>
      ))}
    </div>
  );
}
