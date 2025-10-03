"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { ImmunizationItem } from "@/types/profile";

type DraftItem = ImmunizationItem & { id: string; dateInput: string };

type ImmunizationsEditorProps = {
  open: boolean;
  items?: ImmunizationItem[];
  onClose: () => void;
  onSave: (items: ImmunizationItem[]) => Promise<void> | void;
  saving?: boolean;
};

export default function ImmunizationsEditor({ open, items, onClose, onSave, saving = false }: ImmunizationsEditorProps) {
  const { t } = useT();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = Array.isArray(items)
      ? items.map(item => ({
          ...item,
          id: cryptoRandomId(),
          dateInput: item.date ? item.date.slice(0, 10) : "",
        }))
      : [];
    setDrafts(initial);
    setError(null);
  }, [open, items]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {error ? <p className="flex-1 text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
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
              const normalized = drafts.map(({ id, dateInput, ...rest }) => ({
                ...rest,
                vaccine: rest.vaccine.trim(),
                dateInput: dateInput.trim(),
                lot: rest.lot?.trim() || undefined,
                source: rest.source?.trim() || undefined,
              }));

              const hasInvalidName = normalized.some(item => item.vaccine.length < 2);
              if (hasInvalidName) {
                setError(t("profile.common.validateEntries"));
                return;
              }

              const hasInvalidDate = normalized.some(item => item.dateInput === "" || !isValidDateInput(item.dateInput));
              if (hasInvalidDate) {
                setError(t("profile.immunizations.invalidDate"));
                return;
              }

              const hasInvalidSource = normalized.some(
                item => item.source && !isValidUrl(item.source),
              );
              if (hasInvalidSource) {
                setError(t("profile.immunizations.invalidUrl"));
                return;
              }

              const cleaned: ImmunizationItem[] = normalized.map(item => ({
                vaccine: item.vaccine,
                date: toIsoDate(item.dateInput),
                lot: item.lot,
                source: item.source,
              }));

              setError(null);
              await onSave(cleaned);
            }}
            disabled={saving}
          >
            {saving ? t("profile.common.saving") : t("profile.common.saveChanges")}
          </button>
        </div>
      </div>
    ),
    [drafts, error, onClose, onSave, saving, t],
  );

  return (
    <ProfileAddonModal
      open={open}
      title={t("profile.immunizations.title")}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-4 text-sm">
        {drafts.length === 0 ? (
          <p className="text-muted-foreground">{t("profile.common.noItems")}</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((item, index) => (
              <li key={item.id} className="rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.immunizations.vaccine")}
                    </span>
                    <input
                      className="rounded-md border px-3 py-2"
                      value={item.vaccine}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, vaccine: event.target.value } : draft,
                          ),
                        )
                      }
                      placeholder={t("profile.immunizations.vaccine")}
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.immunizations.date")}
                    </span>
                    <input
                      type="date"
                      className="rounded-md border px-3 py-2"
                      value={item.dateInput}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, dateInput: event.target.value } : draft,
                          ),
                        )
                      }
                      max={new Date().toISOString().slice(0, 10)}
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.immunizations.lot")}
                    </span>
                    <input
                      className="rounded-md border px-3 py-2"
                      value={item.lot ?? ""}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, lot: event.target.value } : draft,
                          ),
                        )
                      }
                      placeholder={t("profile.immunizations.lot")}
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.immunizations.source")}
                    </span>
                    <input
                      className="rounded-md border px-3 py-2"
                      value={item.source ?? ""}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, source: event.target.value } : draft,
                          ),
                        )
                      }
                      placeholder={t("profile.immunizations.source")}
                      disabled={saving}
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border px-2 py-2 text-muted-foreground transition hover:bg-muted"
                    onClick={() => setDrafts(prev => prev.filter((_, i) => i !== index))}
                    aria-label={t("profile.common.delete")}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          onClick={() =>
            setDrafts(prev => [
              ...prev,
              {
                id: cryptoRandomId(),
                vaccine: "",
                date: new Date().toISOString(),
                dateInput: "",
              },
            ])
          }
          disabled={saving}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("profile.immunizations.add")}
        </button>
      </div>
    </ProfileAddonModal>
  );
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(value: string) {
  if (!value) {
    return new Date().toISOString();
  }
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString();
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.host);
  } catch {
    return false;
  }
}
