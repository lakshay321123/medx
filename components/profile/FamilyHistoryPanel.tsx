"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";

import { useT } from "@/components/hooks/useI18n";
import type { FamilyHistoryItem } from "@/types/profile";
import type { FamilyHistoryEditorProps } from "@/components/profile/editors/FamilyHistoryEditor";

const FamilyHistoryEditor = dynamic<FamilyHistoryEditorProps>(
  () => import("@/components/profile/editors/FamilyHistoryEditor"),
  { ssr: false },
);

type FamilyHistoryPanelProps = {
  items?: FamilyHistoryItem[];
  onSave: (items: FamilyHistoryItem[]) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function FamilyHistoryPanel({
  items,
  onSave,
  saving = false,
  disabled = false,
}: FamilyHistoryPanelProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const hasItems = safeItems.length > 0;

  return (
    <div className="space-y-3 text-sm">
      {hasItems ? (
        <ul className="divide-y rounded-lg border">
          {safeItems.map((item, index) => (
            <li key={`${item.relation}-${item.condition}-${index}`} className="space-y-1 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium" title={item.condition}>
                  {item.condition}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {relationLabel(item.relation, t)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{t("profile.familyHistory.onsetAge")}</span>
                <span>
                  {item.onsetAge != null ? item.onsetAge : t("profile.common.notRecorded")}
                </span>
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
            aria-label={t("profile.familyHistory.add")}
            disabled={saving || disabled}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t("profile.common.add")}
          </button>
        </div>
      )}
      {hasItems ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => {
              if (!disabled) setOpen(true);
            }}
            disabled={saving || disabled}
          >
            {t("profile.common.edit")}
          </button>
        </div>
      ) : null}
      <FamilyHistoryEditor
        open={open}
        items={safeItems}
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

function relationLabel(value: FamilyHistoryItem["relation"], translate: (key: string) => string) {
  const key = `profile.familyHistory.relation.${value}`;
  const localized = translate(key);
  return localized !== key ? localized : value;
}
