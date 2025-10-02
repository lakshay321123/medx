"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";

import LifestyleEditor from "@/components/profile/editors/LifestyleEditor";
import { useT } from "@/components/hooks/useI18n";
import type { Lifestyle } from "@/types/profile";

type LifestylePanelProps = {
  lifestyle?: Lifestyle;
  onSave: (lifestyle: Lifestyle | null) => Promise<void> | void;
  saving?: boolean;
};

export default function LifestylePanel({ lifestyle, onSave, saving = false }: LifestylePanelProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const hasData = Boolean(lifestyle);
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

  const infoLines = useMemo(() => {
    if (!lifestyle) return [] as { key: string; label: string; value: string }[];
    return (
      [
        ["drugs", lifestyle.drugs],
        ["diet", lifestyle.diet],
        ["activity", lifestyle.activity],
        ["sleep", lifestyle.sleep],
        ["occupation", lifestyle.occupation],
        ["exposures", lifestyle.exposures],
      ] as const
    )
      .filter(([, value]) => Boolean(value?.trim()))
      .map(([key, value]) => ({
        key,
        label: t(`profile.lifestyle.${key}`),
        value: String(value),
      }));
  }, [lifestyle, t]);

  return (
    <div className="space-y-3 text-sm">
      {hasData ? (
        <div className="space-y-3">
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
          {infoLines.length ? (
            <ul className="divide-y rounded-lg border">
              {infoLines.map(line => (
                <li key={line.key} className="space-y-1 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{line.label}</div>
                  <div className="truncate" title={line.value}>
                    {line.value}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span className="text-muted-foreground">{t("profile.common.noItems")}</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            onClick={() => setOpen(true)}
            aria-label={t("profile.lifestyle.title")}
            disabled={saving}
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            {t("Add")}
          </button>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
          disabled={saving}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t(hasData ? "Edit" : "Add")}
        </button>
      </div>
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
        saving={saving}
      />
    </div>
  );
}

function statusLabel(value: Lifestyle["smoking"]["status"] | Lifestyle["alcohol"]["status"], translate: (key: string) => string) {
  if (value === "none") return translate("profile.lifestyle.none");
  if (value === "former") return translate("profile.lifestyle.former");
  if (value === "current") return translate("profile.lifestyle.current");
  if (value === "occasional") return translate("profile.lifestyle.occasional");
  if (value === "regular") return translate("profile.lifestyle.regular");
  return value;
}
