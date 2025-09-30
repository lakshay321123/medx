"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bell,
  CalendarClock,
  Database,
  Home,
  Link2,
  Lock,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";

import { useT } from "@/components/hooks/useI18n";
import GeneralPanel from "@/components/settings/panels/General";
import NotificationsPanel from "@/components/settings/panels/Notifications";
import PersonalizationPanel from "@/components/settings/panels/Personalization";
import ConnectorsPanel from "@/components/settings/panels/Connectors";
import SchedulesPanel from "@/components/settings/panels/Schedules";
import DataControlsPanel from "@/components/settings/panels/DataControls";
import SecurityPanel from "@/components/settings/panels/Security";
import AccountPanel from "@/components/settings/panels/Account";
import { useUIStore, type PreferencesTab } from "@/components/hooks/useUIStore";

export type TabKey = PreferencesTab;

type Props = {
  defaultTab?: PreferencesTab;
  onClose: () => void;
  asMobile?: boolean;
};

type Section = {
  id: PreferencesTab;
  titleKey: string;
  icon: LucideIcon;
};

export default function SettingsPane({
  defaultTab = "General",
  onClose,
  asMobile,
}: Props) {
  const t = useT();
  const setPrefsTab = useUIStore((state) => state.setPrefsTab);
  const sections = useMemo<Section[]>(
    () => [
      { id: "General", titleKey: "General", icon: Home },
      { id: "Notifications", titleKey: "Notifications", icon: Bell },
      { id: "Personalization", titleKey: "Personalization", icon: SlidersHorizontal },
      { id: "Connectors", titleKey: "Connectors", icon: Link2 },
      { id: "Schedules", titleKey: "Schedules", icon: CalendarClock },
      { id: "Data controls", titleKey: "Data controls", icon: Database },
      { id: "Security", titleKey: "Security", icon: Lock },
      { id: "Account", titleKey: "Account", icon: User },
    ],
    []
  );

  const [activeId, setActive] = useState<PreferencesTab>(defaultTab);

  useEffect(() => {
    setActive(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    setPrefsTab(defaultTab);
  }, [defaultTab, setPrefsTab]);

  const handleSelect = (id: PreferencesTab) => {
    setActive(id);
    setPrefsTab(id);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onClose();
  };

  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];
  const activeSlug = activeSection.id.toLowerCase().replace(/\s+/g, "-");

  const renderPanel = () => {
    switch (activeSection.id) {
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      <nav
        className={clsx(
          "flex w-64 shrink-0 flex-col gap-1 overflow-auto pr-4",
          "border-r border-[var(--border)]",
          asMobile &&
            "max-sm:w-auto max-sm:flex-row max-sm:border-0 max-sm:pb-2 max-sm:pr-0 max-sm:pl-1 max-sm:pt-1 max-sm:overflow-x-auto max-sm:gap-2 no-scrollbar"
        )}
        role="tablist"
        aria-label={t("Preferences sections")}
      >
        {sections.map(({ id, titleKey, icon: Icon }) => {
          const active = id === activeId;
          const slug = id.toLowerCase().replace(/\s+/g, "-");
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${slug}`}
              id={`tab-${slug}`}
              onClick={() => handleSelect(id)}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px]",
                "hover:bg-[var(--surface)]",
                active && "bg-[var(--surface)] ring-1 ring-[var(--border)]",
                asMobile &&
                  "max-sm:w-auto max-sm:flex-none max-sm:items-center max-sm:justify-center max-sm:gap-2 max-sm:px-3 max-sm:py-1.5 max-sm:text-sm max-sm:rounded-full",
                asMobile &&
                  (active
                    ? "max-sm:bg-[var(--surface-2)] max-sm:border max-sm:border-[var(--border)] max-sm:text-[var(--text)]"
                    : "max-sm:bg-[var(--surface)] max-sm:text-[var(--muted)]")
              )}
            >
              <Icon size={14} className="opacity-70" />
              <span>{t(titleKey)}</span>
            </button>
          );
        })}
      </nav>
      <section
        role="tabpanel"
        id={`panel-${activeSlug}`}
        aria-labelledby={`tab-${activeSlug}`}
        className="flex-1 sm:pl-6"
      >
        <form id="preferences-form" onSubmit={handleSubmit} className="flex h-full flex-col">
          <header className="border-b border-[var(--border)] px-5 py-3 text-[15px] font-semibold">
            {t(activeSection.titleKey)}
          </header>
          <div className="flex-1 overflow-auto divide-y divide-[var(--border)]">
            {renderPanel()}
          </div>
        </form>
      </section>
    </div>
  );
}
