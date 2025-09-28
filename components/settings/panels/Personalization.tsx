"use client";

import type { ReactNode } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { t } from "@/lib/i18n/dictionaries";

const Row = ({ title, sub, right }: { title: string; sub?: string; right: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-4">
    <div>
      <div className="text-[13px] font-semibold">{title}</div>
      {sub ? <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
    <div>{right}</div>
  </div>
);

function ToggleSwitch({ setting }: { setting: "compact" | "quickActions" }) {
  const value = useSettingsStore((state) => state[setting] as boolean);
  const set = useSettingsStore((state) => state.set);
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={value}
        onChange={(event) => set(setting, event.target.checked)}
      />
      <span className="inline-block h-6 w-11 rounded-full bg-slate-300/60 transition peer-checked:bg-blue-600" />
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "translate-x-5" : ""}`} />
    </label>
  );
}

export default function PersonalizationPanel() {
  const lang = useSettingsStore((state) => state.lang);
  const tone = useSettingsStore((state) => state.tone);
  const set = useSettingsStore((state) => state.set);

  return (
    <div className="divide-y divide-black/5 dark:divide-white/10">
      <Row
        title={t(lang, "Tone")}
        right={
          <select
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900/60"
            value={tone}
            onChange={(event) => set("tone", event.target.value as any)}
          >
            <option value="plain">Plain</option>
            <option value="clinical">Clinical</option>
            <option value="friendly">Friendly</option>
          </select>
        }
      />
      <Row title={t(lang, "Compact mode")} right={<ToggleSwitch setting="compact" />} />
      <Row title={t(lang, "Show quick actions on Home")} right={<ToggleSwitch setting="quickActions" />} />
    </div>
  );
}
