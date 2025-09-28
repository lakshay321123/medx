"use client";

import { useState, type ChangeEvent } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";

type LanguagePickerProps = {
  className?: string;
  ariaLabel?: string;
};

export function LanguagePicker({ className, ariaLabel }: LanguagePickerProps) {
  const { locale, available, setLocale, loading } = useI18n();
  const [pending, setPending] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale;
    if (next === locale) return;
    try {
      setPending(true);
      await setLocale(next);
    } finally {
      setPending(false);
    }
  };

  const options = available ?? SUPPORTED_LOCALES;

  return (
    <select
      value={locale}
      onChange={handleChange}
      disabled={loading || pending}
      className={className}
      aria-label={ariaLabel}
    >
      {options.map(option => {
        const native = option.nativeLabel;
        const showNative = native && native !== option.label;
        const label = showNative ? `${option.label} · ${native}` : option.label;
        return (
          <option key={option.code} value={option.code}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
