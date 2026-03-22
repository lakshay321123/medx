"use client";

import { useState } from "react";

type ConnectorStatus = "connected" | "disconnected" | "expired";
type Connector = {
  id: string;
  name: string;
  description: string;
  category: "wearable" | "health_record" | "pharmacy" | "calendar" | "lab";
  status: ConnectorStatus;
  lastSync?: string;
};

const CONNECTORS: Connector[] = [
  { id: "apple_health", name: "Apple Health", description: "Heart rate, steps, sleep, SpO2", category: "wearable", status: "disconnected" },
  { id: "google_fit", name: "Google Fit", description: "Activity, heart rate, sleep", category: "wearable", status: "disconnected" },
  { id: "fitbit", name: "Fitbit", description: "Steps, sleep, heart rate, SpO2", category: "wearable", status: "disconnected" },
  { id: "samsung_health", name: "Samsung Health", description: "Galaxy Watch health data", category: "wearable", status: "disconnected" },
  { id: "garmin", name: "Garmin Connect", description: "Fitness metrics, body battery", category: "wearable", status: "disconnected" },
  { id: "oura", name: "Oura Ring", description: "Sleep quality, readiness, temperature", category: "wearable", status: "disconnected" },
  { id: "epic_mychart", name: "MyChart (Epic)", description: "Medical records, lab results", category: "health_record", status: "disconnected" },
  { id: "1mg", name: "1mg / Tata Health", description: "Prescription tracking", category: "pharmacy", status: "disconnected" },
  { id: "pharmeasy", name: "PharmEasy", description: "Order history, medication tracking", category: "pharmacy", status: "disconnected" },
  { id: "google_calendar", name: "Google Calendar", description: "Sync appointment reminders", category: "calendar", status: "disconnected" },
  { id: "thyrocare", name: "Thyrocare", description: "Auto-import lab results", category: "lab", status: "disconnected" },
  { id: "srl_diagnostics", name: "SRL Diagnostics", description: "Import diagnostic reports", category: "lab", status: "disconnected" },
];

const CATEGORIES = [
  { key: "wearable", label: "Wearable devices" },
  { key: "health_record", label: "Health records" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "lab", label: "Lab providers" },
  { key: "calendar", label: "Calendar" },
] as const;

export default function ConnectorsPanel() {
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
        const data = await res.json().catch((err) => { console.error("JSON parse error:", err); return {}; });
        if (data.authUrl) {
          window.open(data.authUrl, "_blank", "noopener,noreferrer,width=600,height=700");
        }
      }
    } catch (error) {
      console.error(`Failed to connect ${id}:`, error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/wearables/connections?provider=${id}`, { method: "DELETE" });
      setConnectors((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: "disconnected" as const, lastSync: undefined } : c)
      );
    } catch (error) {
      console.error(`Failed to disconnect ${id}:`, error);
    }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="text-xs opacity-60">
        Connect your health apps, wearables, and medical services.
      </div>
      {CATEGORIES.map((cat) => {
        const items = connectors.filter((c) => c.category === cat.key);
        if (!items.length) return null;
        return (
          <div key={cat.key}>
            <div className="mb-2 text-[13px] font-semibold">{cat.label}</div>
            <div className="space-y-2">
              {items.map((conn) => (
                <div key={conn.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{conn.name}</div>
                    <div className="text-xs opacity-50">{conn.description}</div>
                    {conn.lastSync && <div className="text-[10px] opacity-40 mt-0.5">Last sync: {conn.lastSync}</div>}
                  </div>
                  {conn.status === "connected" ? (
                    <button type="button" onClick={() => handleDisconnect(conn.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
                      Disconnect
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleConnect(conn.id)} disabled={connecting === conn.id}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                      {connecting === conn.id ? "Connecting" : "Connect"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
