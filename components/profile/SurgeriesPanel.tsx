"use client";

import { useMemo, useState } from "react";
import { Calendar, Plus } from "lucide-react";

import SurgeriesEditor from "@/components/profile/editors/SurgeriesEditor";
import { useT } from "@/components/hooks/useI18n";
import type { SurgeryItem } from "@/types/profile";

type SurgeriesPanelProps = {
  surgeries?: SurgeryItem[];
  onSave: (items: SurgeryItem[]) => Promise<void> | void;
  saving?: boolean;
};

export default function SurgeriesPanel({ surgeries, onSave, saving = false }: SurgeriesPanelProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const safeItems = useMemo(() => (Array.isArray(surgeries) ? surgeries : []), [surgeries]);
  const hasItems = safeItems.length > 0;

  return (
    <div className="space-y-3 text-sm">
      {hasItems ? (
        <ul className="divide-y rounded-lg border">
          {safeItems.map((item, index) => {
            const dateLabel = formatDate(item.date, t);
            return (
              <li key={`${item.procedure}-${index}`} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium" title={item.procedure}>
                    {item.procedure}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={dateLabel}>
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {dateLabel}
                  </span>
                </div>
                {item.notes ? (
                  <p className="truncate text-xs text-muted-foreground" title={item.notes}>
                    {item.notes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span className="text-muted-foreground">{t("profile.common.noItems")}</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            onClick={() => setOpen(true)}
            aria-label={t("profile.surgeries.add")}
            disabled={saving}
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
            onClick={() => setOpen(true)}
            disabled={saving}
          >
            {t("profile.common.edit")}
          </button>
        </div>
      ) : null}
      <SurgeriesEditor
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

function formatDate(value: string | undefined, translate: (key: string) => string) {
  if (!value) return translate("profile.common.notRecorded");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toLocaleDateString();
}
