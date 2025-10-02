"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import AccessibilityEditor from "@/components/profile/editors/AccessibilityEditor";
import { useT } from "@/components/hooks/useI18n";
import type { Accessibility } from "@/types/profile";

type AccessibilityPanelProps = {
  accessibility?: Accessibility;
  onSave: (accessibility: Accessibility | null) => Promise<void> | void;
  saving?: boolean;
};

export default function AccessibilityPanel({ accessibility, onSave, saving = false }: AccessibilityPanelProps) {
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
            onClick={() => setOpen(true)}
            aria-label={t("profile.accessibility.title")}
            disabled={saving}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t("Add")}
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
          disabled={saving}
        >
          {t(hasData ? "Edit" : "Add")}
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
        saving={saving}
      />
    </div>
  );
}
