"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import FamilyHistoryEditor from "@/components/profile/editors/FamilyHistoryEditor";
import { useT } from "@/components/hooks/useI18n";
import type { FamilyHistoryItem } from "@/types/profile";

type FamilyHistoryPanelProps = {
  items?: FamilyHistoryItem[];
  onSave: (items: FamilyHistoryItem[]) => Promise<void> | void;
  saving?: boolean;
};

export default function FamilyHistoryPanel({ items, onSave, saving = false }: FamilyHistoryPanelProps) {
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
                <span className="truncate" title={item.condition}>
                  {t("profile.familyHistory.condition")}
                </span>
                <span>
                  {item.onsetAge != null
                    ? t("Age") + ": " + item.onsetAge
                    : t("profile.common.notRecorded")}
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
            onClick={() => setOpen(true)}
            aria-label={t("profile.familyHistory.add")}
            disabled={saving}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            {t("Add")}
          </button>
        </div>
      )}
      {hasItems ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setOpen(true)}
            disabled={saving}
          >
            {t("Edit")}
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
        saving={saving}
      />
    </div>
  );
}

function relationLabel(value: FamilyHistoryItem["relation"], translate: (key: string) => string) {
  const key = `profile.familyHistory.relation.${value}`;
  const localized = translate(key);
  return localized !== key ? localized : value;
}
