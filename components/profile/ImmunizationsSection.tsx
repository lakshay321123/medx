"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Section from "@/components/profile/Section";
import { useT } from "@/components/hooks/useI18n";
import type { ImmunizationItem } from "@/types/profile";
import type { ImmunizationsEditorProps } from "@/components/profile/editors/ImmunizationsEditor";

const ImmunizationsEditor = dynamic<ImmunizationsEditorProps>(
  () => import("@/components/profile/editors/ImmunizationsEditor"),
  { ssr: false },
);

type Props = {
  items?: ImmunizationItem[];
  onSave: (items: ImmunizationItem[]) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function ImmunizationsSection({
  items,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const hasItems = safeItems.length > 0;

  return (
    <>
      <Section
        title={t("profile.immunizations.title")}
        ctaLabel={t(hasItems ? "profile.common.edit" : "profile.common.add")}
        onCta={() => {
          if (!disabled) setOpen(true);
        }}
        ctaDisabled={saving || disabled}
        isEmpty={!hasItems}
        emptyMessage={t("profile.common.noItems")}
      >
        <ul className="divide-y rounded-lg border">
          {safeItems.map((item, index) => {
            const dateLabel = formatDate(item.date, t);
            return (
              <li key={`${item.vaccine}-${index}`} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium" title={item.vaccine}>
                    {item.vaccine}
                  </span>
                  <span className="text-xs text-muted-foreground" title={dateLabel}>
                    {dateLabel}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {item.lot ? (
                    <span title={item.lot} className="truncate">
                      {t("profile.immunizations.lot")}: {item.lot}
                    </span>
                  ) : null}
                  {item.source ? (
                    <a
                      href={item.source}
                      className="truncate underline"
                      target="_blank"
                      rel="noreferrer"
                      title={item.source}
                    >
                      {t("profile.immunizations.source")}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
      <ImmunizationsEditor
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

function formatDate(value: string | undefined, translate: (key: string) => string) {
  if (!value) return translate("profile.common.notRecorded");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toLocaleDateString();
}
