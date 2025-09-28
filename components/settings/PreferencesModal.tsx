"use client";

import {
  Bell,
  CalendarClock,
  ChevronDown,
  Database,
  Link2,
  Lock,
  Settings as SettingsIcon,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import PreferencesTabs from "./PreferencesTabs";
import GeneralPanel from "./panels/GeneralPanel";
import NotificationsPanel from "./panels/NotificationsPanel";
import PersonalizationPanel from "./panels/PersonalizationPanel";
import ConnectorsPanel from "./panels/ConnectorsPanel";
import SchedulesPanel from "./panels/SchedulesPanel";
import DataControlsPanel from "./panels/DataControlsPanel";
import SecurityPanel from "./panels/SecurityPanel";
import AccountPanel from "./panels/AccountPanel";

export type PreferenceTab =
  | "General"
  | "Notifications"
  | "Personalization"
  | "Connectors"
  | "Schedules"
  | "Data controls"
  | "Security"
  | "Account";

interface PreferencesModalProps {
  open?: boolean;
  defaultTab?: PreferenceTab;
  onClose?: () => void;
}

const TAB_ITEMS = [
  { id: "General" as const, label: "General", icon: SettingsIcon },
  { id: "Notifications" as const, label: "Notifications", icon: Bell },
  { id: "Personalization" as const, label: "Personalization", icon: SlidersHorizontal },
  { id: "Connectors" as const, label: "Connectors", icon: Link2 },
  { id: "Schedules" as const, label: "Schedules", icon: CalendarClock },
  { id: "Data controls" as const, label: "Data controls", icon: Database },
  { id: "Security" as const, label: "Security", icon: Lock },
  { id: "Account" as const, label: "Account", icon: User },
];

const PANEL_COMPONENTS: Record<PreferenceTab, () => JSX.Element> = {
  General: GeneralPanel,
  Notifications: NotificationsPanel,
  Personalization: PersonalizationPanel,
  Connectors: ConnectorsPanel,
  Schedules: SchedulesPanel,
  "Data controls": DataControlsPanel,
  Security: SecurityPanel,
  Account: AccountPanel,
};

function getFocusableElements(container: HTMLElement) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors.join(',')));
  return nodes.filter((node) => !node.hasAttribute("aria-hidden"));
}

export default function PreferencesModal({ open = false, defaultTab = "General", onClose }: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState<PreferenceTab>(defaultTab);
  const [visible, setVisible] = useState(open);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setVisible(open);
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previous = document.activeElement as HTMLElement | null;
    previousFocusRef.current = previous;

    const node = dialogRef.current;
    if (node) {
      const focusables = getFocusableElements(node);
      (focusables[0] ?? node).focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey) {
        if (currentIndex <= 0) {
          focusables[focusables.length - 1].focus();
          event.preventDefault();
        }
      } else if (currentIndex === focusables.length - 1) {
        focusables[0].focus();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [visible]);

  const handleClose = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === overlayRef.current) {
        handleClose();
      }
    },
    [handleClose]
  );

  const headerId = useMemo(() => `preferences-panel-${activeTab.replace(/\s+/g, "-").toLowerCase()}`, [activeTab]);

  const ActivePanel = useMemo(() => PANEL_COMPONENTS[activeTab], [activeTab]);

  const mobileSelector = (
    <div className="border-b border-slate-200 px-4 py-4 min-[861px]:hidden dark:border-neutral-800">
      <div className="relative">
        <label htmlFor="preferences-tab-select" className="sr-only">
          Preferences section
        </label>
        <select
          id="preferences-tab-select"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as PreferenceTab)}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100 dark:focus:border-neutral-500"
        >
          {TAB_ITEMS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  );

  if (!visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[860px]:items-stretch max-[860px]:justify-stretch max-[860px]:p-0"
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headerId}
        tabIndex={-1}
        className="relative z-10 mx-auto flex h-[min(92vh,620px)] w-[min(96vw,980px)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-xl backdrop-blur-sm max-[860px]:h-full max-[860px]:w-full max-[860px]:flex-col max-[860px]:rounded-none max-[860px]:border-none dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-slate-100"
      >
        <PreferencesTabs
          items={TAB_ITEMS}
          activeTab={activeTab}
          onSelect={setActiveTab}
          onClose={handleClose}
        />

        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-neutral-800">
            <div>
              <h2 id={headerId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {activeTab}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Adjust how MedX behaves and personalizes your care.</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 min-[861px]:hidden dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
              aria-label="Close preferences"
            >
              ✕
            </button>
          </div>

          {mobileSelector}

          <div className="flex-1 overflow-y-auto pb-6">
            <ActivePanel />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full bg-[var(--medx-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
