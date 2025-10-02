"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { SurgeryItem } from "@/types/profile";

type DraftItem = SurgeryItem & { id: string; dateInput: string };

type SurgeriesEditorProps = {
  open: boolean;
  items?: SurgeryItem[];
  onClose: () => void;
  onSave: (items: SurgeryItem[]) => Promise<void> | void;
  saving?: boolean;
};

export default function SurgeriesEditor({ open, items, onClose, onSave, saving = false }: SurgeriesEditorProps) {
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
  }, [items, open]);

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
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow disabled:opacity-60"
            onClick={async () => {
              const normalized = drafts.map(({ id, dateInput, ...rest }) => ({
                ...rest,
                procedure: rest.procedure.trim(),
                notes: rest.notes?.trim() || undefined,
                dateInput: dateInput.trim(),
              }));

              const hasInvalidName = normalized.some(item => item.procedure.length < 2);
              if (hasInvalidName) {
                setError(t("profile.common.validateEntries"));
                return;
              }

              const hasInvalidDate = normalized.some(item => item.dateInput === "" || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateInput));
              if (hasInvalidDate) {
                setError(t("profile.surgeries.invalidDate"));
                return;
              }

              const cleaned: SurgeryItem[] = normalized.map(item => ({
                procedure: item.procedure,
                date: toIsoDate(item.dateInput),
                notes: item.notes,
              }));

              setError(null);
              await onSave(cleaned);
            }}
            disabled={saving}
          >
            {saving ? t("Saving…") : t("Save changes")}
          </button>
        </div>
      </div>
    ),
    [drafts, error, onClose, onSave, saving, t],
  );

  return (
    <ProfileAddonModal
      open={open}
      title={t("profile.surgeries.title")}
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
                      {t("profile.surgeries.procedure")}
                    </span>
                    <input
                      className="rounded-md border px-3 py-2"
                      value={item.procedure}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, procedure: event.target.value } : draft,
                          ),
                        )
                      }
                      placeholder={t("profile.surgeries.procedure")}
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("profile.surgeries.date")}</span>
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
                </div>
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{t("profile.surgeries.notes")}</span>
                  <textarea
                    className="rounded-md border px-3 py-2"
                    rows={3}
                    value={item.notes ?? ""}
                    onChange={event =>
                      setDrafts(prev =>
                        prev.map((draft, i) =>
                          i === index ? { ...draft, notes: event.target.value } : draft,
                        ),
                      )
                    }
                    disabled={saving}
                  />
                </label>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border px-2 py-2 text-muted-foreground transition hover:bg-muted"
                    onClick={() => setDrafts(prev => prev.filter((_, i) => i !== index))}
                    aria-label={t("Delete")}
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
                procedure: "",
                date: new Date().toISOString(),
                dateInput: "",
              },
            ])
          }
          disabled={saving}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("profile.surgeries.add")}
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

function toIsoDate(value: string) {
  if (!value) return new Date().toISOString();
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString();
}
