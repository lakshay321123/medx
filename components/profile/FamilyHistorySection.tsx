"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { SectionShell } from "@/components/profile/SectionShell";
import { useT } from "@/components/hooks/useI18n";
import type { FamilyHistoryItem } from "@/types/profile";
import type { FamilyHistoryEditorProps } from "@/components/profile/editors/FamilyHistoryEditor";

const FamilyHistoryEditor = dynamic<FamilyHistoryEditorProps>(
  () => import("@/components/profile/editors/FamilyHistoryEditor"),
  { ssr: false },
);

type Props = {
  items?: FamilyHistoryItem[];
  onSave: (items: FamilyHistoryItem[]) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function FamilyHistorySection({
  items,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const hasItems = safeItems.length > 0;
  const handlePrimary = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  return (
    <>
      <SectionShell
        title={t("profile.familyHistory.title")}
        primaryLabel={t(hasItems ? "profile.common.edit" : "profile.common.add")}
        onPrimary={handlePrimary}
        primaryDisabled={saving || disabled}
      >
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
          <p className="text-sm text-muted-foreground">{t("profile.common.noItems")}</p>
        )}
      </SectionShell>
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
    </>
  );
}

function relationLabel(value: FamilyHistoryItem["relation"], translate: (key: string) => string) {
  const key = `profile.familyHistory.relation.${value}`;
  const localized = translate(key);
  return localized !== key ? localized : value;
}
