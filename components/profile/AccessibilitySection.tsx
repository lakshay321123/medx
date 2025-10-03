"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Section from "@/components/profile/Section";
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

  return (
    <>
      <Section
        title={t("profile.accessibility.title")}
        ctaLabel={t(hasData ? "profile.common.edit" : "profile.common.add")}
        onCta={() => {
          if (!disabled) setOpen(true);
        }}
        ctaDisabled={saving || disabled}
        isEmpty={!hasData}
        emptyMessage={t("profile.common.noItems")}
      >
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
      </Section>
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
