"use client";

import { useEffect, useMemo, useState } from "react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { Accessibility } from "@/types/profile";

export type AccessibilityEditorProps = {
  open: boolean;
  accessibility?: Accessibility;
  onClose: () => void;
  onSave: (accessibility: Accessibility | null) => Promise<void> | void;
  saving?: boolean;
};

export default function AccessibilityEditor({
  open,
  accessibility,
  onClose,
  onSave,
  saving = false,
}: AccessibilityEditorProps) {
  const { t } = useT();
  const [mobility, setMobility] = useState("");
  const [vision, setVision] = useState("");
  const [hearing, setHearing] = useState("");
  const [communication, setCommunication] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMobility(accessibility?.mobility ?? "");
    setVision(accessibility?.vision ?? "");
    setHearing(accessibility?.hearing ?? "");
    setCommunication(accessibility?.communication ?? "");
    setError(null);
  }, [accessibility, open]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {error ? <p className="flex-1 text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            {t("profile.common.cancel")}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow disabled:opacity-60"
            onClick={async () => {
              const payload: Accessibility | null =
                mobility.trim() || vision.trim() || hearing.trim() || communication.trim()
                  ? {
                      ...(mobility.trim() ? { mobility: mobility.trim() } : {}),
                      ...(vision.trim() ? { vision: vision.trim() } : {}),
                      ...(hearing.trim() ? { hearing: hearing.trim() } : {}),
                      ...(communication.trim() ? { communication: communication.trim() } : {}),
                    }
                  : null;
              setError(null);
              await onSave(payload);
            }}
            disabled={saving}
          >
            {saving ? t("profile.common.saving") : t("profile.common.saveChanges")}
          </button>
        </div>
      </div>
    ),
    [communication, hearing, mobility, onClose, onSave, saving, t, vision, error],
  );

  return (
    <ProfileAddonModal
      open={open}
      title={t("profile.accessibility.title")}
      onClose={onClose}
      footer={footer}
    >
      <div className="grid grid-cols-1 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.accessibility.mobility")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={mobility}
            onChange={event => setMobility(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.accessibility.vision")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={vision}
            onChange={event => setVision(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.accessibility.hearing")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={hearing}
            onChange={event => setHearing(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.accessibility.communication")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={communication}
            onChange={event => setCommunication(event.target.value)}
            disabled={saving}
          />
        </label>
      </div>
    </ProfileAddonModal>
  );
}
