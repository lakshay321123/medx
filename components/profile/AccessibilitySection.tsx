"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { SectionShell } from "@/components/profile/SectionShell";
import { useT } from "@/components/hooks/useI18n";
import type { Accessibility } from "@/types/profile";
import type { AccessibilityEditorProps } from "@/components/profile/editors/AccessibilityEditor";

const AccessibilityEditor = dynamic<AccessibilityEditorProps>(
  () => import("@/components/profile/editors/AccessibilityEditor"),
  { ssr: false },
);

type Props = {
  accessibility?: Accessibility;
  onSave: (accessibility: Accessibility | null) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function AccessibilitySection({
  accessibility,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () =>
      Object.entries(accessibility ?? {})
        .filter(([, value]) => Boolean((value as string)?.toString?.().trim?.() ?? value))
        .map(([key, value]) => ({ key, value: String(value) })),
    [accessibility],
  );
  const hasData = entries.length > 0;
  const handlePrimary = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  return (
    <>
      <SectionShell
        title={t("profile.accessibility.title")}
        primaryLabel={t(hasData ? "profile.common.edit" : "profile.common.add")}
        onPrimary={handlePrimary}
        primaryDisabled={saving || disabled}
      >
        {hasData ? (
          <ul className="divide-y rounded-lg border">
            {entries.map(entry => (
              <li key={entry.key} className="space-y-1 px-3 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t(`profile.accessibility.${entry.key}`)}
                </div>
                <div className="truncate" title={entry.value}>
                  {entry.value}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.common.noItems")}</p>
        )}
      </SectionShell>
      <AccessibilityEditor
        open={open}
        accessibility={accessibility}
        onClose={() => setOpen(false)}
        onSave={async data => {
          try {
            await onSave(data);
            setOpen(false);
          } catch (error) {
            console.error(error);
          }
        }}
        saving={saving || disabled}
      />
    </>
  );
}
