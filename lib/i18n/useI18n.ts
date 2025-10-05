"use client";

import { useT } from "@/components/hooks/useI18n";

export function useI18n() {
  const t = useT();
  const language = t.lang ?? "en";
  return { t, language };
}
