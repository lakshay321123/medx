"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { LanguagePicker } from "@/components/i18n/LanguagePicker";

export function LanguageSettings() {
  const { formatMessage } = useI18n();
  const heading = formatMessage({ id: "language.label", defaultMessage: "Language" });

  return (
    <div className="rounded-xl border p-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{heading}</span>
        <LanguagePicker className="rounded-md border px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-900" />
      </label>
    </div>
  );
}
