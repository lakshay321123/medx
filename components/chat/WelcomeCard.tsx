"use client";

import { useT } from "@/components/hooks/useI18n";

export default function WelcomeCard() {
  const t = useT();

  return (
    <div className="rounded-2xl border border-[color:var(--medx-outline)] bg-[color:var(--medx-panel)] p-6 text-center shadow-sm dark:border-white/10 dark:bg-[color:var(--medx-panel)]">
      <h2 className="text-lg font-semibold text-[color:var(--medx-text)]">
        {t("Start a new conversation")}
      </h2>
      <p className="mt-2 text-sm text-[color:var(--medx-subtle-text)]">
        {t("Ask about wellness, therapy, research or clinical topics.")}
      </p>
    </div>
  );
}
