"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import ProfileAddonModal from "@/components/profile/editors/ProfileAddonModal";
import { useT } from "@/components/hooks/useI18n";
import type { FamilyHistoryItem } from "@/types/profile";

type FamilyHistoryEditorProps = {
  open: boolean;
  items?: FamilyHistoryItem[];
  onClose: () => void;
  onSave: (items: FamilyHistoryItem[]) => Promise<void> | void;
  saving?: boolean;
};

type DraftItem = FamilyHistoryItem & { id: string };

const RELATIONS: FamilyHistoryItem["relation"][] = ["father", "mother", "sibling", "child"];

export default function FamilyHistoryEditor({ open, items, onClose, onSave, saving = false }: FamilyHistoryEditorProps) {
  const { t } = useT();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initial = Array.isArray(items)
      ? items.map(item => ({ ...item, id: cryptoRandomId() }))
      : [];
    setDrafts(initial);
    setError(null);
  }, [open, items]);

  const emptyState = drafts.length === 0;

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
              const normalized = drafts.map(({ id, ...rest }) => ({
                ...rest,
                condition: rest.condition.trim(),
                onsetAge:
                  typeof rest.onsetAge === "number"
                    ? rest.onsetAge
                    : parseInt(String(rest.onsetAge ?? ""), 10),
              }));

              const invalid = normalized.some(item => item.condition !== "" && item.condition.length < 2);
              if (invalid) {
                setError(t("profile.common.validateEntries"));
                return;
              }

              const cleaned = normalized
                .map(item => ({
                  ...item,
                  onsetAge: Number.isFinite(item.onsetAge) ? item.onsetAge : undefined,
                }))
                .filter(item => item.condition.length >= 2);

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
      title={t("profile.familyHistory.title")}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-4 text-sm">
        {emptyState ? (
          <p className="text-muted-foreground">{t("profile.common.noItems")}</p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((item, index) => (
              <li key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.familyHistory.relation")}
                    </span>
                    <select
                      className="rounded-md border px-3 py-2"
                      value={item.relation}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, relation: event.target.value as DraftItem["relation"] } : draft,
                          ),
                        )
                      }
                      disabled={saving}
                    >
                      {RELATIONS.map(rel => (
                        <option key={rel} value={rel}>
                          {relationLabel(rel, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-[2] flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.familyHistory.condition")}
                    </span>
                    <input
                      className="rounded-md border px-3 py-2"
                      value={item.condition}
                      onChange={event =>
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, condition: event.target.value } : draft,
                          ),
                        )
                      }
                      placeholder={t("profile.familyHistory.condition")}
                      disabled={saving}
                    />
                  </label>
                  <label className="flex w-full max-w-[140px] flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("profile.familyHistory.onsetAge")}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="rounded-md border px-3 py-2"
                      value={item.onsetAge ?? ""}
                      onChange={event => {
                        const numeric = event.target.value === "" ? undefined : Number(event.target.value);
                        setDrafts(prev =>
                          prev.map((draft, i) =>
                            i === index ? { ...draft, onsetAge: Number.isFinite(numeric) ? numeric : undefined } : draft,
                          ),
                        );
                      }}
                      min={0}
                      max={120}
                      disabled={saving}
                    />
                  </label>
                  <button
                    type="button"
                    className="self-start rounded-md border px-2 py-2 text-muted-foreground transition hover:bg-muted"
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
                relation: "father",
                condition: "",
              },
            ])
          }
          disabled={saving}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("profile.familyHistory.add")}
        </button>
      </div>
    </ProfileAddonModal>
  );
}

function relationLabel(value: FamilyHistoryItem["relation"], translate: (key: string) => string) {
  const key = `profile.familyHistory.relation.${value}`;
  const base = translate(key);
  if (base !== key) return base;
  if (value === "father") return translate("Father");
  if (value === "mother") return translate("Mother");
  if (value === "sibling") return translate("Sibling");
  if (value === "child") return translate("Child");
  return value;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
