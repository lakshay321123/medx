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
    <aside className="hidden h-full w-[280px] flex-none flex-col border-r border-slate-200/80 bg-white/80 px-4 py-6 backdrop-blur max-[860px]:hidden dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preferences</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preferences"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-300 dark:hover:bg-neutral-800"
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
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-slate-100"
                  : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white/70 dark:text-slate-300 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/40"
              }`}
            >
              <tab.icon size={16} className={isActive ? "text-[color:var(--medx-accent)]" : "text-slate-400 dark:text-slate-500"} />
              <span className={`font-medium ${isActive ? "text-[color:var(--medx-accent)]" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
