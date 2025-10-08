"use client";

import { useEffect, useMemo, useState } from "react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { AdvanceDirectives } from "@/types/profile";

export type AdvanceDirectivesEditorProps = {
  open: boolean;
  directives?: AdvanceDirectives;
  onClose: () => void;
  onSave: (directives: AdvanceDirectives | null) => Promise<void> | void;
  saving?: boolean;
};

type CodeStatus = NonNullable<AdvanceDirectives["codeStatus"]>;
const CODE_OPTIONS: CodeStatus[] = ["FULL", "DNR", "DNI"];

export default function AdvanceDirectivesEditor({
  open,
  directives,
  onClose,
  onSave,
  saving = false,
}: AdvanceDirectivesEditorProps) {
  const { t } = useT();
  const [codeStatus, setCodeStatus] = useState<CodeStatus | "">("");
  const [surrogateName, setSurrogateName] = useState("");
  const [surrogatePhone, setSurrogatePhone] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCodeStatus(directives?.codeStatus ?? "");
    setSurrogateName(directives?.surrogateName ?? "");
    setSurrogatePhone(directives?.surrogatePhone ?? "");
    setDocumentUrl(directives?.documentUrl ?? "");
    setError(null);
  }, [directives, open]);

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
              if (documentUrl.trim() && !isValidUrl(documentUrl.trim())) {
                setError(t("profile.advanceDirectives.invalidUrl"));
                return;
              }
              const payload: AdvanceDirectives | null =
                codeStatus || surrogateName.trim() || surrogatePhone.trim() || documentUrl.trim()
                  ? {
                      ...(codeStatus ? { codeStatus } : {}),
                      ...(surrogateName.trim() ? { surrogateName: surrogateName.trim() } : {}),
                      ...(surrogatePhone.trim() ? { surrogatePhone: surrogatePhone.trim() } : {}),
                      ...(documentUrl.trim() ? { documentUrl: documentUrl.trim() } : {}),
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
    [codeStatus, documentUrl, error, onClose, onSave, saving, surrogateName, surrogatePhone, t],
  );

  return (
    <ProfileAddonModal
      open={open}
      title={t("profile.advanceDirectives.title")}
      onClose={onClose}
      footer={footer}
    >
      <div className="grid grid-cols-1 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.advanceDirectives.codeStatus")}</span>
          <select
            className="rounded-md border px-3 py-2"
            value={codeStatus}
            onChange={event => setCodeStatus(event.target.value as CodeStatus | "")}
            disabled={saving}
          >
            <option value="">—</option>
            {CODE_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`profile.advanceDirectives.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.advanceDirectives.surrogateName")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={surrogateName}
            onChange={event => setSurrogateName(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.advanceDirectives.surrogatePhone")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={surrogatePhone}
            onChange={event => setSurrogatePhone(event.target.value)}
            disabled={saving}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">{t("profile.advanceDirectives.documentUrl")}</span>
          <input
            className="rounded-md border px-3 py-2"
            value={documentUrl}
            onChange={event => setDocumentUrl(event.target.value)}
            placeholder="https://"
            disabled={saving}
          />
        </label>
      </div>
    </ProfileAddonModal>
  );
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}
