"use client";

import { useT } from "@/components/hooks/useI18n";

type WelcomeCardProps = {
  header?: string;
  body?: string;
  status?: string;
  onDismiss?: () => void;
};

export default function WelcomeCard({ header, body, status, onDismiss }: WelcomeCardProps) {
  const t = useT();
  const fallbackHeader = t("Start a new conversation");
  const fallbackBody = t("Ask about wellness, therapy, research or clinical topics.");
  const resolvedHeader = header ? t(header) : fallbackHeader;
  const resolvedBody = body ? t(body) : fallbackBody;
  const resolvedStatus = status ? t(status) : undefined;

  return (
    <div className="rounded-2xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-panel)] p-6 text-center shadow-sm dark:border-white/10 dark:bg-[color:var(--medx-panel)]">
      {resolvedHeader ? (
        <h2 className="text-lg font-semibold text-[color:var(--medx-text)]">{resolvedHeader}</h2>
      ) : null}
      {resolvedBody ? (
        <p className="mt-2 text-sm text-[color:var(--medx-subtle-text)]">{resolvedBody}</p>
      ) : null}
      {status ? (
        <p className="mt-2 text-xs text-[color:var(--medx-subtle-text)]">{resolvedStatus ?? status}</p>
      ) : null}
      {onDismiss ? (
        <div className="mt-3">
          <button type="button" className="btn-subtle" onClick={onDismiss}>
            {t("Dismiss")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
