"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Bell,
  SlidersHorizontal,
  Link2,
  CalendarClock,
  Database,
  Lock,
  User,
  Home,
} from "lucide-react";
import cn from "clsx";
import GeneralPanel from "./panels/General";
import NotificationsPanel from "./panels/Notifications";
import PersonalizationPanel from "./panels/Personalization";
import ConnectorsPanel from "./panels/Connectors";
import SchedulesPanel from "./panels/Schedules";
import DataControlsPanel from "./panels/DataControls";
import SecurityPanel from "./panels/Security";
import AccountPanel from "./panels/Account";

export type TabKey =
  | "General"
  | "Notifications"
  | "Personalization"
  | "Connectors"
  | "Schedules"
  | "Data controls"
  | "Security"
  | "Account";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "General", label: "General", icon: Home },
  { key: "Notifications", label: "Notifications", icon: Bell },
  { key: "Personalization", label: "Personalization", icon: SlidersHorizontal },
  { key: "Connectors", label: "Connectors", icon: Link2 },
  { key: "Schedules", label: "Schedules", icon: CalendarClock },
  { key: "Data controls", label: "Data controls", icon: Database },
  { key: "Security", label: "Security", icon: Lock },
  { key: "Account", label: "Account", icon: User },
];

export default function PreferencesModal({
  open,
  defaultTab = "General",
  onClose,
}: {
  open: boolean;
  defaultTab?: TabKey;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const Panel = useMemo(() => {
    switch (tab) {
      case "General":
        return <GeneralPanel />;
      case "Notifications":
        return <NotificationsPanel />;
      case "Personalization":
        return <PersonalizationPanel />;
      case "Connectors":
        return <ConnectorsPanel />;
      case "Schedules":
        return <SchedulesPanel />;
      case "Data controls":
        return <DataControlsPanel />;
      case "Security":
        return <SecurityPanel />;
      case "Account":
        return <AccountPanel />;
    }
  }, [tab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute left-1/2 top-1/2 h-[min(92vh,620px)] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-md dark:bg-slate-900/80 dark:ring-white/10"
      >
        <div className="flex h-full">
          <aside className="w-[280px] border-r border-black/5 bg-white/70 p-2 pr-1 dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-sm font-semibold opacity-70">Preferences</div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="mt-1 space-y-1 overflow-auto pr-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-black/5 dark:hover:bg-white/10",
                    tab === key &&
                      "bg-black/5 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10"
                  )}
                >
                  <Icon size={14} className="opacity-70" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-black/5 px-5 py-3 text-[15px] font-semibold dark:border-white/10">
              {tab}
            </header>
            <div className="flex-1 divide-y divide-black/5 overflow-auto dark:divide-white/10">
              {Panel}
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
              <button
                onClick={onClose}
                className="rounded-lg border border-black/10 bg-white/70 px-3.5 py-1.5 text-sm hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Save changes
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
