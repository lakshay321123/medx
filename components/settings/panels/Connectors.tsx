"use client";

import { useState } from "react";
import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

type ConnectorStatus = "connected" | "disconnected" | "expired";

type Connector = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "wearable" | "health_record" | "pharmacy" | "calendar" | "lab";
  status: ConnectorStatus;
  lastSync?: string;
};

const CONNECTORS: Connector[] = [
  { id: "apple_health", name: "Apple Health", description: "Sync heart rate, steps, sleep, SpO2 from Apple Watch and iPhone", icon: "\u2764\uFE0F", category: "wearable", status: "disconnected" },
  { id: "google_fit", name: "Google Fit", description: "Import activity, heart rate, and sleep data", icon: "\uD83C\uDFC3", category: "wearable", status: "disconnected" },
  { id: "fitbit", name: "Fitbit", description: "Steps, sleep, heart rate, SpO2, and stress score", icon: "\u231A", category: "wearable", status: "disconnected" },
  { id: "samsung_health", name: "Samsung Health", description: "Galaxy Watch and phone health data", icon: "\uD83D\uDCF1", category: "wearable", status: "disconnected" },
  { id: "garmin", name: "Garmin Connect", description: "Advanced fitness metrics, body battery, stress", icon: "\uD83E\uDDED", category: "wearable", status: "disconnected" },
  { id: "oura", name: "Oura Ring", description: "Sleep quality, readiness, temperature trends", icon: "\uD83D\uDCAD", category: "wearable", status: "disconnected" },
  { id: "epic_mychart", name: "MyChart (Epic)", description: "Import medical records, lab results, medications", icon: "\uD83C\uDFE5", category: "health_record", status: "disconnected" },
  { id: "1mg", name: "1mg / Tata Health", description: "Prescription tracking and refill reminders", icon: "\uD83D\uDC8A", category: "pharmacy", status: "disconnected" },
  { id: "pharmeasy", name: "PharmEasy", description: "Order history and medication tracking", icon: "\uD83D\uDC8A", category: "pharmacy", status: "disconnected" },
  { id: "google_calendar", name: "Google Calendar", description: "Sync appointment reminders to your calendar", icon: "\uD83D\uDCC5", category: "calendar", status: "disconnected" },
  { id: "thyrocare", name: "Thyrocare", description: "Auto-import lab test results", icon: "\uD83E\uDDEA", category: "lab", status: "disconnected" },
  { id: "srl_diagnostics", name: "SRL Diagnostics", description: "Import diagnostic lab reports", icon: "\uD83E\uDDEA", category: "lab", status: "disconnected" },
];

const CATEGORIES = [
  { key: "wearable", label: "Wearable devices" },
  { key: "health_record", label: "Health records" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "lab", label: "Lab providers" },
  { key: "calendar", label: "Calendar" },
] as const;

function StatusBadge({ status }: { status: ConnectorStatus }) {
  const cls: Record<ConnectorStatus, string> = {
    connected: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
    disconnected: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400",
    expired: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls[status]}`}>
      {status === "connected" ? "Connected" : status === "expired" ? "Reconnect" : "Connect"}
    </span>
  );
}

export default function ConnectorsPanel() {
  const { draft, set } = usePrefsDraft();
  const [connectors, setConnectors] = useState(CONNECTORS);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (id: string) => {
    setConnecting(id);
    try {
      const res = await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.authUrl) {
          window.open(data.authUrl, "_blank", "width=600,height=700");
        }
        setConnectors((prev) =>
          prev.map((c) => c.id === id ? { ...c, status: "connected" as const, lastSync: "Just now" } : c)
        );
      }
    } catch { /* handled */ }
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/wearables/connections?provider=${id}`, { method: "DELETE" });
      setConnectors((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: "disconnected" as const, lastSync: undefined } : c)
      );
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Connect your health apps, wearables, and medical services. Data syncs securely and stays private.
      </div>

      {CATEGORIES.map((cat) => {
        const items = connectors.filter((c) => c.category === cat.key);
        if (!items.length) return null;
        return (
          <div key={cat.key}>
            <div className="mb-2 text-[13px] font-semibold">{cat.label}</div>
            <div className="space-y-2">
              {items.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60"
                >
                  <span className="text-xl shrink-0" aria-hidden>{conn.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{conn.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{conn.description}</div>
                    {conn.lastSync && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Last sync: {conn.lastSync}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={conn.status} />
                    {conn.status === "connected" ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(conn.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(conn.id)}
                        disabled={connecting === conn.id}
                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        {connecting === conn.id ? "..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
