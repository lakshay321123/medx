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
  ExternalLink,
} from "lucide-react";
import cn from "clsx";
import { useT } from "@/components/hooks/useI18n";
import { PREF_SECTIONS, type PrefRow } from "./prefs.schema";
import PreferencesTabs from "./PreferencesTabs";
import { usePrefs as useFlagPrefs } from "@/components/hooks/usePrefs";
import { usePrefs as usePreferenceState, type Prefs } from "@/components/providers/PreferencesProvider";

const ICONS: Record<string, LucideIcon> = {
  general: Home,
  notifications: Bell,
  personalization: SlidersHorizontal,
  connectors: Link2,
  schedules: CalendarClock,
  "data-controls": Database,
  security: Lock,
  account: User,
};

const LANG_OPTIONS: Array<{ value: Prefs["lang"]; labelKey: string }> = [
  { value: "en", labelKey: "English" },
  { value: "hi", labelKey: "Hindi" },
  { value: "ar", labelKey: "Arabic" },
  { value: "it", labelKey: "Italian" },
  { value: "zh", labelKey: "Chinese" },
  { value: "es", labelKey: "Spanish" },
];

const SELECT_OPTIONS: Record<string, Array<{ value: string; labelKey: string }>> = {
  theme: [
    { value: "system", labelKey: "System" },
    { value: "light", labelKey: "Light" },
    { value: "dark", labelKey: "Dark" },
  ],
  tone: [
    { value: "plain", labelKey: "Plain" },
    { value: "clinical", labelKey: "Clinical" },
    { value: "friendly", labelKey: "Friendly" },
  ],
  accent: [{ value: "purple", labelKey: "Purple" }],
  lang: LANG_OPTIONS,
  sessionTimeout: [
    { value: "Never", labelKey: "Never" },
    { value: "5m", labelKey: "5 minutes" },
    { value: "15m", labelKey: "15 minutes" },
    { value: "1h", labelKey: "1 hour" },
  ],
  plan: [
    { value: "free", labelKey: "Free" },
    { value: "pro", labelKey: "Pro" },
  ],
};

function missingBinding(message: string) {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
  console.error(message);
}

type PreferenceModalProps = {
  open: boolean;
  defaultTab?: string;
  onClose: () => void;
};

type SelectBinding = {
  value: string;
  onChange: (value: string) => void;
};

type ToggleBinding = {
  value: boolean;
  onToggle: () => void;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export default function PreferencesModal({ open, defaultTab = "General", onClose }: PreferenceModalProps) {
  const { prefsMobileSheet } = useFlagPrefs();
  const isMobile = useIsMobile();
  const useSheet = prefsMobileSheet && isMobile;

  const [activeSectionId, setActiveSectionId] = useState<string>(() => {
    const match = PREF_SECTIONS.find(
      (section) => section.titleKey.toLowerCase() === defaultTab.toLowerCase(),
    );
    return (match ?? PREF_SECTIONS[0]).id;
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const [ignoreFirst, setIgnoreFirst] = useState(false);
  const t = useT();
  const prefs = usePreferenceState();

  const activeSection = useMemo(() => {
    return (
      PREF_SECTIONS.find((section) => section.id === activeSectionId) ?? PREF_SECTIONS[0]
    );
  }, [activeSectionId]);

  useEffect(() => {
    if (open) {
      const match = PREF_SECTIONS.find(
        (section) => section.titleKey.toLowerCase() === defaultTab.toLowerCase(),
      );
      setActiveSectionId((match ?? PREF_SECTIONS[0]).id);
    }
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
        (el) => !el.hasAttribute("disabled"),
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

  const getToggleBinding = (id: string): ToggleBinding | null => {
    switch (id) {
      case "quickActions":
        return {
          value: prefs.quickActions,
          onToggle: () => prefs.set("quickActions", !prefs.quickActions),
        };
      case "compact":
        return {
          value: prefs.compact,
          onToggle: () => prefs.set("compact", !prefs.compact),
        };
      case "medReminders":
        return {
          value: prefs.medReminders,
          onToggle: () => prefs.set("medReminders", !prefs.medReminders),
        };
      case "labUpdates":
        return {
          value: prefs.labUpdates,
          onToggle: () => prefs.set("labUpdates", !prefs.labUpdates),
        };
      case "weeklyDigest":
        return {
          value: prefs.weeklyDigest,
          onToggle: () => prefs.set("weeklyDigest", !prefs.weeklyDigest),
        };
      case "memoryEnabled":
        return {
          value: prefs.memoryEnabled,
          onToggle: () => prefs.set("memoryEnabled", !prefs.memoryEnabled),
        };
      case "memoryAutosave":
        return {
          value: prefs.memoryAutosave,
          onToggle: () => prefs.set("memoryAutosave", !prefs.memoryAutosave),
        };
      case "maskSensitive":
        return {
          value: prefs.maskSensitive,
          onToggle: () => prefs.set("maskSensitive", !prefs.maskSensitive),
        };
      case "passcode":
        return {
          value: prefs.passcode,
          onToggle: () => prefs.set("passcode", !prefs.passcode),
        };
      default:
        return null;
    }
  };

  const getSelectBinding = (id: string): SelectBinding | null => {
    switch (id) {
      case "theme":
        return {
          value: prefs.theme,
          onChange: (value) => prefs.set("theme", value as Prefs["theme"]),
        };
      case "tone":
        return {
          value: prefs.tone,
          onChange: (value) => prefs.set("tone", value as Prefs["tone"]),
        };
      case "accent":
        return {
          value: prefs.accent,
          onChange: (value) => prefs.set("accent", value as Prefs["accent"]),
        };
      case "lang":
        return {
          value: prefs.lang,
          onChange: (value) => prefs.setLang(value as Prefs["lang"]),
        };
      case "sessionTimeout":
        return {
          value: prefs.sessionTimeout,
          onChange: (value) =>
            prefs.set("sessionTimeout", value as Prefs["sessionTimeout"]),
        };
      case "plan":
        return {
          value: prefs.plan,
          onChange: (value) => prefs.setPlan(value as Prefs["plan"]),
        };
      default:
        return null;
    }
  };

  const handleAction = (row: PrefRow & { type: "action" }) => {
    switch (row.action) {
      case "reset":
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("medx-prefs-v1");
          window.location.reload();
        }
        break;
      case "export":
        if (typeof window !== "undefined") {
          const { set, setLang, incUsage, resetWindowIfNeeded, setPlan, canSend, ...rest } = prefs;
          const data = JSON.stringify(rest, null, 2);
          const blob = new Blob([data], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "medx-preferences.json";
          anchor.click();
          URL.revokeObjectURL(url);
        }
        break;
      case "clear":
        missingBinding(`Unhandled action handler for row ${row.id}`);
        break;
      default:
        missingBinding(`Unknown action ${row.action}`);
        break;
    }
  };

  const renderRow = (sectionId: string, row: PrefRow) => {
    const key = `${sectionId}:${row.id}`;
    const label = t(row.labelKey);
    const description = row.descKey ? t(row.descKey) : null;

    if (row.type === "toggle") {
      const binding = getToggleBinding(row.id);
      if (!binding) {
        missingBinding(`Missing toggle binding for ${row.id}`);
        return null;
      }
      return (
        <div
          key={key}
          data-pref-row={key}
          className="flex min-h-[48px] items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text)]">{label}</div>
            {description ? (
              <div className="text-xs text-[var(--muted)]">{description}</div>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={binding.value}
            onClick={binding.onToggle}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border border-[var(--border)] transition-colors",
              binding.value
                ? "bg-[var(--brand)]"
                : "bg-[var(--surface)]",
            )}
          >
            <span className="sr-only">{label}</span>
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-[var(--brand-contrast)] shadow transition-transform",
                binding.value ? "translate-x-5" : "translate-x-0.5 bg-[var(--surface-2)]",
              )}
            />
          </button>
        </div>
      );
    }

    if (row.type === "select") {
      const options = SELECT_OPTIONS[row.optionsKey];
      if (!options) {
        missingBinding(`Missing options for select ${row.id}`);
        return null;
      }
      const binding = getSelectBinding(row.id);
      if (!binding) {
        missingBinding(`Missing select binding for ${row.id}`);
        return null;
      }
      return (
        <div
          key={key}
          data-pref-row={key}
          className="flex min-h-[48px] items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text)]">{label}</div>
            {description ? (
              <div className="text-xs text-[var(--muted)]">{description}</div>
            ) : null}
          </div>
          <select
            value={binding.value}
            onChange={(event) => binding.onChange(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] shadow-sm"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (row.type === "link") {
      return (
        <div
          key={key}
          data-pref-row={key}
          className="flex min-h-[48px] items-center justify-between gap-4 py-3"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--text)]">{label}</div>
            {description ? (
              <div className="text-xs text-[var(--muted)]">{description}</div>
            ) : null}
          </div>
          <a
            href={row.href}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--brand)]"
          >
            {t("Open")}
            <ExternalLink size={14} />
          </a>
        </div>
      );
    }

    if (row.type === "action") {
      return (
        <div
          key={key}
          data-pref-row={key}
          className="flex min-h-[48px] items-center justify-between gap-4 py-3"
        >
          <div className="text-sm font-medium text-[var(--text)]">{label}</div>
          <button
            type="button"
            onClick={() => handleAction(row)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--surface)]/70"
          >
            {t("Run")}
          </button>
        </div>
      );
    }

    missingBinding(`Unsupported row type ${(row as any).type}`);
    return null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className={cn(
          "absolute inset-0 bg-[var(--backdrop)] transition-opacity",
          ignoreFirst && "pointer-events-none",
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
        className={cn(
          "pointer-events-auto flex flex-col bg-[var(--surface-2)] text-[var(--text)] ring-1 ring-[var(--border)] shadow-xl",
          useSheet
            ? "fixed inset-x-0 bottom-0 max-h-[85vh] w-full overflow-hidden rounded-t-2xl"
            : "sm:absolute sm:left-1/2 sm:top-1/2 sm:h-[min(92vh,620px)] sm:w-[min(96vw,980px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-hidden sm:rounded-2xl sm:shadow-2xl",
          "sm:flex-row",
        )}
      >
        <aside className="hidden w-[280px] flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] sm:flex">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="text-sm font-semibold text-[var(--muted)]">{t("Preferences")}</div>
            <button
              data-close
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
              aria-label={t("Close dialog")}
            >
              <X size={16} />
            </button>
          </div>
          <PreferencesTabs
            sections={PREF_SECTIONS}
            activeId={activeSectionId}
            onSelect={setActiveSectionId}
            icons={ICONS}
            translate={t}
            variant="desktop"
          />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 sm:hidden">
            <h2 id="preferences-title" className="text-base font-semibold">
              {t("Preferences")}
            </h2>
            <button
              data-close
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface)]"
              aria-label={t("Close dialog")}
            >
              <X size={16} />
            </button>
          </header>
          <div className="sm:hidden">
            <PreferencesTabs
              sections={PREF_SECTIONS}
              activeId={activeSectionId}
              onSelect={setActiveSectionId}
              icons={ICONS}
              translate={t}
              variant="mobile"
            />
          </div>
          <div className="hidden border-b border-[var(--border)] px-5 py-3 text-[15px] font-semibold sm:block">
            {t(activeSection.titleKey)}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+72px)] sm:px-6 sm:pb-6">
            <div className="space-y-2">
              {activeSection.rows.map((row) => renderRow(activeSection.id, row))}
            </div>
          </div>
          <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 sm:static sm:px-5 sm:py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--text)]"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-[var(--brand-contrast)]"
            >
              {t("Save changes")}
            </button>
          </footer>
        </section>
      </div>
      <style jsx global>{`
        :root {
          --surface: var(--medx-surface);
          --surface-2: var(--medx-panel);
          --border: var(--medx-outline);
          --text: var(--medx-text);
          --muted: var(--medx-subtext);
          --brand: var(--medx-accent);
          --brand-contrast: var(--medx-bg-c);
          --backdrop: rgba(0, 0, 0, 0.6);
        }
        .dark {
          --surface: var(--medx-surface);
          --surface-2: var(--medx-panel);
          --border: var(--medx-outline);
          --text: var(--medx-text);
          --muted: var(--medx-subtext);
          --brand: var(--medx-accent);
          --brand-contrast: var(--medx-surface);
          --backdrop: rgba(0, 0, 0, 0.6);
        }
      `}</style>
    </div>
  );
}
