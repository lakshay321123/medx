"use client";
import { useState } from "react";
import { Watch, Smartphone, Activity, ChevronRight, Check } from "lucide-react";

type Provider = { id: string; name: string; icon: typeof Watch; status: "connected" | "disconnected" };

const PROVIDERS: Provider[] = [
  { id: "apple_health", name: "Apple Health", icon: Activity, status: "disconnected" },
  { id: "google_fit", name: "Google Fit", icon: Smartphone, status: "disconnected" },
  { id: "fitbit", name: "Fitbit", icon: Watch, status: "disconnected" },
  { id: "samsung_health", name: "Samsung Health", icon: Watch, status: "disconnected" },
];

export default function WearableSync() {
  const [providers, setProviders] = useState(PROVIDERS);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    // Simulated — real implementation needs OAuth flow per provider
    await new Promise(r => setTimeout(r, 1500));
    setProviders(prev => prev.map(p =>
      p.id === providerId ? { ...p, status: "connected" as const } : p
    ));
    setConnecting(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
        Connected Devices
      </h3>
      <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">
        Sync your wearable data for better health insights.
      </p>
      <div className="space-y-2">
        {providers.map(p => {
          const Icon = p.icon;
          const isConnecting = connecting === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => p.status === "disconnected" ? handleConnect(p.id) : undefined}
              disabled={isConnecting}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-3.5 text-left transition hover:bg-[rgba(6,182,212,0.03)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(6,182,212,0.08)]">
                <Icon className="h-5 w-5 text-[var(--so-accent,#06B6D4)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{p.name}</p>
                <p className="text-xs text-[var(--so-text-secondary,#8E8E93)]">
                  {p.status === "connected" ? "Syncing" : "Not connected"}
                </p>
              </div>
              {p.status === "connected" ? (
                <Check className="h-5 w-5 text-emerald-500" />
              ) : isConnecting ? (
                <svg className="h-5 w-5 animate-spin text-[var(--so-accent,#06B6D4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 019.95 9" strokeLinecap="round" />
                </svg>
              ) : (
                <ChevronRight className="h-5 w-5 text-[var(--so-text-secondary,#8E8E93)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
