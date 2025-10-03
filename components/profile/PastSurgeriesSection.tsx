"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import Section from "@/components/profile/Section";
import { useT } from "@/components/hooks/useI18n";
import type { SurgeryItem } from "@/types/profile";
import type { SurgeriesEditorProps } from "@/components/profile/editors/SurgeriesEditor";

const SurgeriesEditor = dynamic<SurgeriesEditorProps>(
  () => import("@/components/profile/editors/SurgeriesEditor"),
  { ssr: false },
);

type Props = {
  surgeries?: SurgeryItem[];
  onSave: (items: SurgeryItem[]) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function PastSurgeriesSection({
  surgeries,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const safeItems = useMemo(() => (Array.isArray(surgeries) ? surgeries : []), [surgeries]);
  const hasItems = safeItems.length > 0;

  return (
    <>
      <Section
        title={t("profile.surgeries.title")}
        ctaLabel={t(hasItems ? "profile.common.edit" : "profile.common.add")}
        onCta={() => {
          if (!disabled) setOpen(true);
        }}
        ctaDisabled={saving || disabled}
        isEmpty={!hasItems}
        emptyMessage={t("profile.common.noItems")}
      >
        <ul className="divide-y rounded-lg border">
          {safeItems.map((item, index) => (
            <li key={`${item.procedure}-${index}`} className="space-y-1 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium" title={item.procedure}>
                  {item.procedure}
                </span>
                <span className="text-xs text-muted-foreground" title={formatDate(item.date)}>
                  {formatDate(item.date)}
                </span>
              </div>
              {item.notes ? (
                <p className="text-xs text-muted-foreground" title={item.notes}>
                  {item.notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>
      <SurgeriesEditor
        open={open}
        surgeries={safeItems}
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

function formatDate(value: string | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toLocaleDateString();
}
