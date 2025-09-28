"use client";

import { LucideIcon } from "lucide-react";
import { PreferenceTab } from "./PreferencesModal";

interface TabItem {
  id: PreferenceTab;
  label: string;
  icon: LucideIcon;
}

interface PreferencesTabsProps {
  items: TabItem[];
  activeTab: PreferenceTab;
  onSelect: (tab: PreferenceTab) => void;
  onClose: () => void;
}

export default function PreferencesTabs({ items, activeTab, onSelect, onClose }: PreferencesTabsProps) {
  return (
    <aside className="hidden h-full w-[280px] flex-none flex-col border-r border-neutral-800 bg-neutral-950/60 px-4 py-6 max-[860px]:hidden">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-200">Preferences</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preferences"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-900"
        >
          ✕
        </button>
      </div>

      <nav className="flex flex-col gap-2" aria-label="Preferences tabs">
        {items.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                  ? "border border-neutral-700 bg-neutral-800/70 text-white"
                  : "border border-transparent text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/40"
              }`}
            >
              <tab.icon size={16} className={isActive ? "text-white" : "text-neutral-400"} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
