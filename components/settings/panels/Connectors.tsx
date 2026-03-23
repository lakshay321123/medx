"use client";

import { useState, useEffect } from "react";

type ConnectorStatus = "connected" | "disconnected";
type Connector = {
  id: string;
  name: string;
  description: string;
  category: "wearable" | "health_record" | "pharmacy" | "calendar" | "lab";
  status: ConnectorStatus;
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

  // Load actual connection status from Supabase
  useEffect(() => {
    fetch("/api/wearables/connections", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const active = new Set((d.connections || []).filter((c: any) => c.status === "connected").map((c: any) => c.provider));
        if (active.size > 0) {
          setConnectors(prev => prev.map(c => active.has(c.id) ? { ...c, status: "connected" as const } : c));
        }
      })
      .catch(err => console.error("Failed to load connections:", err));
  }, []);
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
        const data = await res.json().catch((err) => { console.error("JSON parse:", err); return {}; });
        if (data.authUrl) window.open(data.authUrl, "_blank", "noopener,noreferrer,width=600,height=700");
      }
    } catch (error) {
      console.error(`Connect ${id}:`, error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/wearables/connections?provider=${id}`, { method: "DELETE" });
      setConnectors((prev) => prev.map((c) => c.id === id ? { ...c, status: "disconnected" as const } : c));
    } catch (error) {
      console.error(`Disconnect ${id}:`, error);
    }
  };

  return (
    <div className="space-y-5 p-5">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Connect your health apps and wearables. Data syncs securely.
      </div>
      {CATEGORIES.map((cat) => {
        const items = connectors.filter((c) => c.category === cat.key);
        if (!items.length) return null;
        return (
          <div key={cat.key}>
            <div className="mb-2 text-[13px] font-semibold">{cat.label}</div>
            <div className="space-y-1.5">
              {items.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium">{conn.name}</div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">{conn.description}</div>
                  </div>
                  {conn.status === "connected" ? (
                    <button type="button" onClick={() => handleDisconnect(conn.id)}
                      className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-red-600"
                      style={{ background: "rgba(255,59,48,0.1)" }}>
                      Disconnect
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleConnect(conn.id)} disabled={connecting === conn.id}
                      className="ml-3 shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
                      style={{ background: "var(--so-accent, #06B6D4)" }}>
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
