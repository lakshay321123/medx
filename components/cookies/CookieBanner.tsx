"use client";

import { useT } from "@/components/hooks/useI18n";
import { usePrefs } from "@/components/providers/PreferencesProvider";

export type CookieBannerProps = {
  open: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  openPreferences: () => void;
};

export default function CookieBanner({
  open,
  acceptAll,
  rejectNonEssential,
  openPreferences,
}: CookieBannerProps) {
  const t = useT();
  const { dir } = usePrefs();

  if (!open) return null;

  return (
    <div
      dir={dir}
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-black/10 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80"
      role="dialog"
      aria-live="polite"
    >
      <p className="text-sm text-slate-700 dark:text-slate-200">
        {t("We use cookies to improve your experience. See our")}{" "}
        <a href="/legal/cookies" className="underline">
          {t("Cookie Policy")}
        </a>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={acceptAll}
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-blue-500/90 dark:focus-visible:ring-offset-slate-900"
        >
          {t("Accept all")}
        </button>
        <button
          type="button"
          onClick={rejectNonEssential}
          className="rounded-lg border border-black/10 bg-white/70 px-3.5 py-1.5 text-sm text-slate-700 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-slate-900"
        >
          {t("Reject non-essential")}
        </button>
        <button
          type="button"
          onClick={openPreferences}
          className="rounded-lg border border-black/10 bg-white/70 px-3.5 py-1.5 text-sm text-slate-700 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-slate-900"
        >
          {t("Manage")}
        </button>
      </div>
    </div>
  );
}
