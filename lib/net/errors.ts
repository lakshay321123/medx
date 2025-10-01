"use client";

import { t } from "@/components/hooks/useI18n";

export function normalizeNetworkError(err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("Network error:", err);
  }
  return { userMessage: t("Network error") } as const;
}
