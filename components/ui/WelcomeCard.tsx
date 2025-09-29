"use client";

import { X } from "lucide-react";
import { useT } from "@/components/hooks/useI18n";

export type WelcomeCardProps = {
  header?: string;
  body?: string;
  status?: string;
  onDismiss: () => void;
  className?: string;
};

function joinClassNames(...values: (string | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export default function WelcomeCard({
  header,
  body,
  status,
  onDismiss,
  className,
}: WelcomeCardProps) {
  const { t } = useT();
  const displayHeader = header ?? t("Start a new conversation");
  const displayBody = body ?? t("Ask about wellness, therapy, research or clinical topics.");

  return (
    <div
      role="region"
      aria-label={t("Welcome")}
      className={joinClassNames(
        "relative rounded-lg border p-3 shadow-sm text-sm",
        "bg-blue-600 text-white border-blue-500",
        "dark:bg-blue-700 dark:border-blue-600",
        "break-words",
        className,
      )}
    >
      <button
        type="button"
        aria-label={t("Dismiss welcome")}
        onClick={onDismiss}
        tabIndex={0}
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <div className="pr-6">
        <div className="text-[0.95rem] font-semibold">{displayHeader}</div>
        <div className="mt-1 leading-snug text-blue-50 dark:text-blue-100">{displayBody}</div>
        {status ? <div className="mt-1 text-xs opacity-90">{status}</div> : null}
      </div>
    </div>
  );
}
