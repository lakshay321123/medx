"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function LocalizedAppShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { direction } = useI18n();
  return (
    <div dir={direction} className={className}>
      {children}
    </div>
  );
}
