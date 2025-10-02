"use client";

import { useEffect, useMemo, useState } from "react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { Lifestyle } from "@/types/profile";

type LifestyleEditorProps = {
  open: boolean;
  lifestyle?: Lifestyle;
  onClose: () => void;
  onSave: (lifestyle: Lifestyle | null) => Promise<void> | void;
  saving?: boolean;
};

type SmokingStatus = Lifestyle["smoking"]["status"];
type AlcoholStatus = Lifestyle["alcohol"]["status"];

export default function LifestyleEditor({ open, lifestyle, onClose, onSave, saving = false }: LifestyleEditorProps) {
  const { t } = useT();
  const [smokingStatus, setSmokingStatus] = useState<SmokingStatus>("none");
  const [packsPerDay, setPacksPerDay] = useState("");
  const [years, setYears] = useState("");
  const [alcoholStatus, setAlcoholStatus] = useState<AlcoholStatus>("none");
  const [unitsPerWeek, setUnitsPerWeek] = useState("");
  const [drugs, setDrugs] = useState("");
  const [diet, setDiet] = useState("");
  const [activity, setActivity] = useState("");
  const [sleep, setSleep] = useState("");
  const [occupation, setOccupation] = useState("");
  const [exposures, setExposures] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSmokingStatus(lifestyle?.smoking?.status ?? "none");
    setPacksPerDay(lifestyle?.smoking?.packsPerDay != null ? String(lifestyle.smoking.packsPerDay) : "");
    setYears(lifestyle?.smoking?.years != null ? String(lifestyle.smoking.years) : "");
    setAlcoholStatus(lifestyle?.alcohol?.status ?? "none");
    setUnitsPerWeek(lifestyle?.alcohol?.unitsPerWeek != null ? String(lifestyle.alcohol.unitsPerWeek) : "");
    setDrugs(lifestyle?.drugs ?? "");
    setDiet(lifestyle?.diet ?? "");
    setActivity(lifestyle?.activity ?? "");
    setSleep(lifestyle?.sleep ?? "");
    setOccupation(lifestyle?.occupation ?? "");
    setExposures(lifestyle?.exposures ?? "");
    setError(null);
  }, [lifestyle, open]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {error ? <p className="text-sm text-destructive">{error}</p> : <span className="text-xs text-muted-foreground">{t("profile.lifestyle.helper")}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={async () => {
              if (
                packsPerDay &&
                (!Number.isFinite(Number(packsPerDay)) || Number(packsPerDay) <= 0 || Number(packsPerDay) > 5)
              ) {
                setError(t("profile.lifestyle.invalidSmoking"));
                return;
              }
              if (years && (!Number.isInteger(Number(years)) || Number(years) <= 0 || Number(years) > 80)) {
                setError(t("profile.lifestyle.invalidSmoking"));
                return;
              }
              if (
                unitsPerWeek &&
                (!Number.isInteger(Number(unitsPerWeek)) || Number(unitsPerWeek) < 0 || Number(unitsPerWeek) > 100)
              ) {
                setError(t("profile.lifestyle.invalidAlcohol"));
                return;
              }

              const nextLifestyle: Lifestyle = {
                smoking: {
                  status: smokingStatus,
                  ...(packsPerDay ? { packsPerDay: Number(packsPerDay) } : {}),
                  ...(years ? { years: Number(years) } : {}),
                },
                alcohol: {
                  status: alcoholStatus,
                  ...(unitsPerWeek ? { unitsPerWeek: Number(unitsPerWeek) } : {}),
                },
                ...(drugs.trim() ? { drugs: drugs.trim() } : {}),
                ...(diet.trim() ? { diet: diet.trim() } : {}),
                ...(activity.trim() ? { activity: activity.trim() } : {}),
                ...(sleep.trim() ? { sleep: sleep.trim() } : {}),
                ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
                ...(exposures.trim() ? { exposures: exposures.trim() } : {}),
              };

              setError(null);
              const isEmpty =
                smokingStatus === "none" &&
                !packsPerDay &&
                !years &&
                alcoholStatus === "none" &&
                !unitsPerWeek &&
                !drugs.trim() &&
                !diet.trim() &&
                !activity.trim() &&
                !sleep.trim() &&
                !occupation.trim() &&
                !exposures.trim();

              await onSave(isEmpty ? null : nextLifestyle);
            }}
            disabled={saving}
          >
            {saving ? t("Saving…") : t("Save changes")}
          </button>
        </div>
      </div>
    ),
    [
      activity,
      alcoholStatus,
      diet,
      drugs,
      error,
      exposures,
      occupation,
      onClose,
      onSave,
      packsPerDay,
      saving,
      sleep,
      smokingStatus,
      t,
      unitsPerWeek,
      years,
    ],
  );

  return (
    <ProfileAddonModal
      open={open}
      title={t("profile.lifestyle.title")}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("profile.lifestyle.smoking")}</span>
            <select
              className="rounded-md border px-3 py-2"
              value={smokingStatus}
              onChange={event => setSmokingStatus(event.target.value as SmokingStatus)}
              disabled={saving}
            >
              {SMOKING_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {statusLabel(option, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("profile.lifestyle.alcohol")}</span>
            <select
              className="rounded-md border px-3 py-2"
              value={alcoholStatus}
              onChange={event => setAlcoholStatus(event.target.value as AlcoholStatus)}
              disabled={saving}
            >
              {ALCOHOL_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {statusLabel(option, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("profile.lifestyle.packsPerDay")}</span>
            <input
              type="number"
              inputMode="decimal"
              className="rounded-md border px-3 py-2"
              value={packsPerDay}
              onChange={event => setPacksPerDay(event.target.value)}
              min={0}
              max={5}
              step="0.1"
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("profile.lifestyle.years")}</span>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-md border px-3 py-2"
              value={years}
              onChange={event => setYears(event.target.value)}
              min={0}
              max={80}
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("profile.lifestyle.unitsPerWeek")}</span>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-md border px-3 py-2"
              value={unitsPerWeek}
              onChange={event => setUnitsPerWeek(event.target.value)}
              min={0}
              max={100}
              disabled={saving}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {[
            [drugs, setDrugs, "drugs"],
            [diet, setDiet, "diet"],
            [activity, setActivity, "activity"],
            [sleep, setSleep, "sleep"],
            [occupation, setOccupation, "occupation"],
            [exposures, setExposures, "exposures"],
          ].map(([value, setter, key]) => (
            <label key={key as string} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t(`profile.lifestyle.${key}`)}</span>
              <input
                className="rounded-md border px-3 py-2"
                value={value as string}
                onChange={event => (setter as (next: string) => void)(event.target.value)}
                disabled={saving}
              />
            </label>
          ))}
        </div>
      </div>
    </ProfileAddonModal>
  );
}

const SMOKING_OPTIONS: SmokingStatus[] = ["none", "former", "current"];
const ALCOHOL_OPTIONS: AlcoholStatus[] = ["none", "occasional", "regular"];

function statusLabel(value: SmokingStatus | AlcoholStatus, translate: (key: string) => string) {
  if (value === "none") return translate("profile.lifestyle.none");
  if (value === "former") return translate("profile.lifestyle.former");
  if (value === "current") return translate("profile.lifestyle.current");
  if (value === "occasional") return translate("profile.lifestyle.occasional");
  if (value === "regular") return translate("profile.lifestyle.regular");
  return value;
}
