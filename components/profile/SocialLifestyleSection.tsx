"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { SectionShell } from "@/components/profile/SectionShell";
import { useT } from "@/components/hooks/useI18n";
import type { Lifestyle } from "@/types/profile";
import type { LifestyleEditorProps } from "@/components/profile/editors/LifestyleEditor";

const LifestyleEditor = dynamic<LifestyleEditorProps>(
  () => import("@/components/profile/editors/LifestyleEditor"),
  { ssr: false },
);

type Props = {
  lifestyle?: Lifestyle;
  onSave: (lifestyle: Lifestyle | null) => Promise<void> | void;
  saving?: boolean;
  disabled?: boolean;
};

export default function SocialLifestyleSection({
  lifestyle,
  onSave,
  saving = false,
  disabled = false,
}: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const smokingInfo = useMemo(() => {
    if (!lifestyle?.smoking) return null;
    const status = statusLabel(lifestyle.smoking.status, t);
    const details: string[] = [];
    if (lifestyle.smoking.packsPerDay != null) {
      details.push(`${lifestyle.smoking.packsPerDay} ${t("profile.lifestyle.packsPerDay")}`);
    }
    if (lifestyle.smoking.years != null) {
      details.push(`${lifestyle.smoking.years} ${t("profile.lifestyle.years")}`);
    }
    return { status, details };
  }, [lifestyle?.smoking, t]);

  const alcoholInfo = useMemo(() => {
    if (!lifestyle?.alcohol) return null;
    const status = statusLabel(lifestyle.alcohol.status, t);
    const details: string[] = [];
    if (lifestyle.alcohol.unitsPerWeek != null) {
      details.push(`${lifestyle.alcohol.unitsPerWeek} ${t("profile.lifestyle.unitsPerWeek")}`);
    }
    return { status, details };
  }, [lifestyle?.alcohol, t]);

  const hasData = Boolean(smokingInfo || alcoholInfo);
  const handlePrimary = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  return (
    <>
      <SectionShell
        title={t("profile.lifestyle.title")}
        primaryLabel={t(hasData ? "profile.common.edit" : "profile.common.add")}
        onPrimary={handlePrimary}
        primaryDisabled={saving || disabled}
      >
        {hasData ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("profile.lifestyle.smoking")}
              </dt>
              <dd className="text-base font-medium">
                {smokingInfo?.status ?? t("profile.lifestyle.none")}
              </dd>
              {smokingInfo?.details.length ? (
                <dd className="text-xs text-muted-foreground">{smokingInfo.details.join(" · ")}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("profile.lifestyle.alcohol")}
              </dt>
              <dd className="text-base font-medium">
                {alcoholInfo?.status ?? t("profile.lifestyle.none")}
              </dd>
              {alcoholInfo?.details.length ? (
                <dd className="text-xs text-muted-foreground">{alcoholInfo.details.join(" · ")}</dd>
              ) : null}
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t("profile.common.noItems")}</p>
        )}
      </SectionShell>
      <LifestyleEditor
        open={open}
        lifestyle={lifestyle}
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

type StatusValue = Lifestyle["smoking"]["status"] | Lifestyle["alcohol"]["status"];

function statusLabel(value: StatusValue, translate: (key: string) => string) {
  if (value === "none") return translate("profile.lifestyle.none");
  if (value === "former") return translate("profile.lifestyle.former");
  if (value === "current") return translate("profile.lifestyle.current");
  if (value === "occasional") return translate("profile.lifestyle.occasional");
  if (value === "regular") return translate("profile.lifestyle.regular");
  return value;
}
