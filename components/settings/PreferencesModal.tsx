"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Play,
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
import PreferencesTabs from "./PreferencesTabs";
import { PREF_SECTIONS } from "./prefs.schema";
import { useT } from "@/components/hooks/useI18n";
import type { Prefs } from "@/components/providers/PreferencesProvider";
import { usePrefs } from "@/components/providers/PreferencesProvider";

type TabKey =
  | "General"
  | "Notifications"
  | "Personalization"
  | "Connectors"
  | "Schedules"
  | "Data controls"
  | "Security"
  | "Account";

const toDomId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const TAB_ICONS: Record<TabKey, LucideIcon> = {
  General: Home,
  Notifications: Bell,
  Personalization: SlidersHorizontal,
  Connectors: Link2,
  Schedules: CalendarClock,
  "Data controls": Database,
  Security: Lock,
  Account: User,
};

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
  const prefs = usePrefs();

  const tabs = useMemo<Array<{ key: TabKey; label: string; icon: LucideIcon }>>(
    () =>
      PREF_SECTIONS.map((section) => ({
        key: section.id as TabKey,
        label: t(section.titleKey),
        icon: TAB_ICONS[section.id as TabKey],
      })),
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
    const titles = Array.from(
      root.querySelectorAll<HTMLElement>("[data-focus-title]")
    );
    const target = titles.find((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    (target ?? titles[0])?.focus();
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

  const activeDomId = toDomId(tab);

  const handleTabChange = useCallback(
    (key: string) => setTab(key as TabKey),
    []
  );

  const renderMobileRows = (sectionId: string) => {
    const section = PREF_SECTIONS.find((item) => item.id === sectionId);
    if (!section) return null;

    const rows = section.rows;

    if (!rows.length) {
      switch (sectionId) {
        case "Notifications":
          return <NotificationsPanel />;
        case "Personalization":
          return <PersonalizationPanel />;
        case "Connectors":
          return <ConnectorsPanel />;
        case "Schedules":
          return <SchedulesPanel />;
        case "Security":
          return <SecurityPanel />;
        case "Account":
          return <AccountPanel />;
        default:
          return null;
      }
    }

    return (
      <div className="space-y-4">
        {rows.map((row) => {
          switch (row.type) {
            case "toggle": {
              const checked = (prefs as Record<string, unknown>)[row.id] as boolean;
              return (
                <label
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
                >
                  <span className="text-sm">
                    <span className="block font-medium text-[var(--text)]">
                      {t(row.labelKey)}
                    </span>
                    {row.descKey && (
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {t(row.descKey)}
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={Boolean(checked)}
                    onChange={() =>
                      prefs.set(row.id as keyof Prefs, (!checked as unknown) as Prefs[keyof Prefs])
                    }
                  />
                </label>
              );
            }
            case "select": {
              let value = (prefs as Record<string, unknown>)[row.id];
              if (row.id === "language") {
                value = prefs.lang;
              }
              const options = (() => {
                if (row.id === "theme") {
                  return [
                    { value: "system", label: t("System") },
                    { value: "light", label: t("Light") },
                    { value: "dark", label: t("Dark") },
                  ];
                }
                if (row.id === "language") {
                  return [
                    { value: "en", label: "English" },
                    { value: "hi", label: "Hindi" },
                    { value: "ar", label: "Arabic" },
                    { value: "it", label: "Italian" },
                    { value: "zh", label: "Chinese" },
                    { value: "es", label: "Spanish" },
                  ];
                }
                if (row.id === "voice") {
                  return [{ value: "cove", label: "Cove" }];
                }
                return [];
              })();
              const currentValue = String(value ?? options[0]?.value ?? "");
              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 text-sm">
                      <span className="block font-medium text-[var(--text)]">
                        {t(row.labelKey)}
                      </span>
                      {row.descKey && (
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {t(row.descKey)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {row.id === "voice" && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs"
                        >
                          <Play size={14} />
                          {t("Play")}
                        </button>
                      )}
                      <select
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-sm"
                        value={currentValue}
                        onChange={(event) => {
                          const next = event.target.value;
                          if (row.id === "language") {
                            prefs.setLang(next as never);
                            return;
                          }
                          if (row.id === "theme") {
                            prefs.set("theme", next as never);
                            return;
                          }
                        }}
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            }
            case "link":
              return (
                <a
                  key={row.id}
                  href={row.href}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--brand)]"
                >
                  {t(row.labelKey)}
                </a>
              );
            case "action":
              return (
                <button
                  key={row.id}
                  type="button"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left text-sm font-medium"
                >
                  {t(row.labelKey)}
                </button>
              );
          }
        })}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className={cn(
          "absolute inset-0 bg-[var(--backdrop)]",
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
        aria-labelledby="prefs-title"
        ref={cardRef}
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 grid min-h-[40svh] max-h-[85svh] grid-rows-[auto,1fr,auto] overflow-hidden rounded-t-2xl bg-[var(--surface-2)] text-[var(--text)] shadow-xl [@supports(height:100dvh)]:max-h-[85dvh] sm:fixed sm:left-1/2 sm:top-1/2 sm:h-[min(92vh,620px)] sm:w-[min(96vw,980px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:grid-none sm:overflow-hidden sm:rounded-2xl sm:bg-white/90 sm:text-inherit sm:ring-1 sm:ring-black/5 sm:backdrop-blur-md sm:shadow-2xl sm:dark:bg-slate-900/80 sm:dark:ring-white/10"
      >
        <span id="prefs-title" className="sr-only" tabIndex={-1}>
          {t("Preferences")}
        </span>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:hidden">
          <h2 data-focus-title tabIndex={-1} className="text-base font-semibold">
            {t("Preferences")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="rounded-md p-2 text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="hidden sm:flex sm:h-full">
          <aside className="hidden w-[280px] border-r border-black/5 bg-white/70 p-2 pr-1 dark:border-white/10 dark:bg-slate-900/60 sm:block">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-sm font-semibold opacity-70">{t("Preferences")}</div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={t("Close")}
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

          <section className="hidden min-w-0 flex-1 flex-col sm:flex">
            <header className="border-b border-black/5 px-5 py-3 text-[15px] font-semibold dark:border-white/10">
              <span data-focus-title tabIndex={-1} className="block">
                {tabs.find((item) => item.key === tab)?.label ?? t(tab)}
              </span>
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
        <div className="flex flex-col sm:hidden">
          <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <PreferencesTabs
              sections={PREF_SECTIONS}
              activeId={tab}
              onSelect={handleTabChange}
              className="px-1 pt-1 pb-2 border-b border-[var(--border)]"
              getLabel={(section) => t(section.titleKey)}
              ariaLabel={t("Preferences sections")}
            />
            <section
              role="tabpanel"
              id={`panel-${activeDomId}`}
              aria-labelledby={`tab-${activeDomId}`}
              className="space-y-4 pt-3"
            >
              {renderMobileRows(tab)}
            </section>
          </div>
          <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/85 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={onClose}>
                {t("Cancel")}
              </button>
              <button className="btn-primary flex-1" onClick={onClose}>
                {t("Save changes")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
