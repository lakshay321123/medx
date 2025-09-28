"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type LucideIcon,
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
import { useT } from "@/components/hooks/useI18n";

type TabKey =
  | "General"
  | "Notifications"
  | "Personalization"
  | "Connectors"
  | "Schedules"
  | "Data controls"
  | "Security"
  | "Account";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [ignoreFirst, setIgnoreFirst] = useState(false);
  const t = useT();

  const tabs = useMemo<Array<{ key: TabKey; label: string; icon: LucideIcon }>>(
    () => [
      { key: "General", label: t("General"), icon: Home },
      { key: "Notifications", label: t("Notifications"), icon: Bell },
      {
        key: "Personalization",
        label: t("Personalization"),
        icon: SlidersHorizontal,
      },
      { key: "Connectors", label: t("Connectors"), icon: Link2 },
      { key: "Schedules", label: t("Schedules"), icon: CalendarClock },
      { key: "Data controls", label: t("Data controls"), icon: Database },
      { key: "Security", label: t("Security"), icon: Lock },
      { key: "Account", label: t("Account"), icon: User },
    ],
    [t]
  );

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

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIgnoreFirst(true);
    const id = requestAnimationFrame(() => setIgnoreFirst(false));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = cardRef.current!;
    const selector = [
      "button",
      "[href]",
      "input",
      "select",
      "textarea",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const getFocusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled")
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusables();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKey as any);
    const closeBtn = root.querySelector<HTMLButtonElement>("[data-close]");
    closeBtn?.focus();
    return () => root.removeEventListener("keydown", onKey as any);
  }, [open]);

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
      <div
        className={cn(
          "absolute inset-0 bg-black/40",
          ignoreFirst && "pointer-events-none"
        )}
        onMouseDown={(e) => {
          if (ignoreFirst) return;
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Preferences")}
        ref={cardRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 h-[min(92vh,620px)] w-[min(96vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white/90 ring-1 ring-black/5 backdrop-blur-md shadow-2xl dark:bg-slate-900/80 dark:ring-white/10"
      >
        <div className="flex h-full">
          <aside className="w-[280px] border-r border-black/5 bg-white/70 p-2 pr-1 dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-sm font-semibold opacity-70">{t("Preferences")}</div>
              <button
                data-close
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <nav className="mt-1 space-y-1 overflow-auto pr-1">
              {tabs.map(({ key, label, icon: Icon }) => (
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
              {tabs.find((item) => item.key === tab)?.label ?? t(tab)}
            </header>
            <div className="flex-1 overflow-auto divide-y divide-black/5 dark:divide-white/10">
              {Panel}
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
              <button
                onClick={onClose}
                className="rounded-lg border border-black/10 bg-white/70 px-3.5 py-1.5 text-sm hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-slate-900/80"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {t("Save changes")}
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
