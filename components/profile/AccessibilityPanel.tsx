"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";

import { useT } from "@/components/hooks/useI18n";
import type { Accessibility } from "@/types/profile";
import type { AccessibilityEditorProps } from "@/components/profile/editors/AccessibilityEditor";

const AccessibilityEditor = dynamic<AccessibilityEditorProps>(
  () => import("@/components/profile/editors/AccessibilityEditor"),
  { ssr: false },
);

type AccessibilityPanelProps = {
  accessibility?: Accessibility;
  onSave: (accessibility: Accessibility | null) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function AccessibilityPanel({
  accessibility,
  onSave,
  saving = false,
  disabled = false,
}: AccessibilityPanelProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasData = Boolean(accessibility && Object.keys(accessibility).length);

  return (
    <div className="space-y-3 text-sm">
      {hasData ? (
        <ul className="divide-y rounded-lg border">
          {Object.entries(accessibility ?? {})
            .filter(([, value]) => Boolean((value as string)?.trim?.() ?? value))
            .map(([key, value]) => (
              <li key={key} className="space-y-1 px-3 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t(`profile.accessibility.${key}`)}
                </div>
                <div className="truncate" title={String(value)}>
                  {String(value)}
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span className="text-muted-foreground">{t("profile.common.noItems")}</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            onClick={() => {
              if (!disabled) setOpen(true);
            }}
            aria-label={t("profile.accessibility.title")}
            disabled={saving || disabled}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t("profile.common.add")}
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          disabled={saving || disabled}
        >
          {t(hasData ? "profile.common.edit" : "profile.common.add")}
        </button>
      </div>
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
    </div>
  );
}
