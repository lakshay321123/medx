"use client";

import { useT } from "@/components/hooks/useI18n";
import { usePrefs } from "@/components/providers/PreferencesProvider";

type LegalPrivacyModalProps = {
  open: boolean;
  onClose: () => void;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  onAccept?: () => void;
  onReject?: () => void;
  acceptDisabled?: boolean;
};

export default function LegalPrivacyModal({
  open,
  onClose,
  consentChecked,
  onConsentChange,
  onAccept,
  onReject,
  acceptDisabled,
}: LegalPrivacyModalProps) {
  const t = useT();
  const { dir } = usePrefs();

  if (!open) return null;

  return (
    <div dir={dir} className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(96vw,900px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <header className="border-b px-5 py-4 text-[15px] font-semibold">{t("Legal & Privacy")}</header>
        <div className="max-h-[70vh] space-y-6 overflow-auto px-6 py-5 text-sm leading-6">
          <section>
            <h3 className="mb-1 font-semibold">{t("Data Privacy & Storage")}</h3>
            <p>{t("Data.store.copy")}</p>
          </section>
          <section>
            <h3 className="mb-1 font-semibold">{t("Cookies & Tracking")}</h3>
            <p>{t("Cookies.copy")}</p>
          </section>
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{t("Essential")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t("Essential.desc")}</div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs font-semibold uppercase">
                <span>{t("On")}</span>
                <span className="font-normal normal-case text-slate-500 dark:text-slate-400">{t("Required")}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{t("Analytics")}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t("Analytics.desc")}</div>
              </div>
            </div>
          </section>
          <label className="mt-2 flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={consentChecked}
              onChange={event => onConsentChange(event.target.checked)}
            />
            <span>{t("Consent.checkbox")}</span>
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-lg border px-3.5 py-1.5 text-sm">
            {t("Cancel")}
          </button>
          <button
            onClick={onReject}
            className="rounded-lg border px-3.5 py-1.5 text-sm"
          >
            {t("Reject Non-Essential")}
          </button>
          <button
            onClick={onAccept}
            disabled={acceptDisabled}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("Accept")}
          </button>
        </footer>
      </div>
    </div>
  );
}

