"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type SurgeryItem = {
  id: string;
  procedure: string;
  date: string;
  notes?: string;
};

export type SurgeryDraft = {
  id: string;
  procedure: string;
  dateInput: string;
  notes?: string;
};

export type SurgeriesEditorProps = {
  value?: SurgeryItem[];
  onChange?: (surgeries: SurgeryItem[]) => void;
  onInvalidDate?: (id: string) => void;
};

function toIsoDateStrict(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date");
  }
  return date.toISOString().slice(0, 10);
}

function normaliseValue(value?: SurgeryItem[]): SurgeryDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => ({
    id: item.id,
    procedure: item.procedure,
    dateInput: item.date,
    notes: item.notes ?? "",
  }));
}

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function SurgeriesEditor({ value, onChange, onInvalidDate }: SurgeriesEditorProps) {
  const [drafts, setDrafts] = useState<SurgeryDraft[]>(() => normaliseValue(value));
  const [invalidDates, setInvalidDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDrafts(normaliseValue(value));
  }, [value]);

  const emitChanges = useCallback(
    (nextDrafts: SurgeryDraft[]) => {
      const cleaned: SurgeryItem[] = [];
      const invalid = new Set<string>();

      for (const draft of nextDrafts) {
        const trimmedProcedure = draft.procedure.trim();
        if (!trimmedProcedure) continue;

        let isoDate: string;
        try {
          isoDate = toIsoDateStrict(draft.dateInput);
        } catch {
          invalid.add(draft.id);
          onInvalidDate?.(draft.id);
          continue;
        }

        cleaned.push({
          id: draft.id,
          procedure: trimmedProcedure,
          date: isoDate,
          notes: draft.notes?.trim() || undefined,
        });
      }

      setInvalidDates(invalid);
      onChange?.(cleaned);
    },
    [onChange, onInvalidDate],
  );

  useEffect(() => {
    emitChanges(drafts);
  }, [drafts, emitChanges]);

  const addSurgery = useCallback(() => {
    setDrafts(prev => [
      ...prev,
      {
        id: createId(),
        procedure: "",
        dateInput: "",
        notes: "",
      },
    ]);
  }, []);

  const updateDraft = useCallback((id: string, patch: Partial<SurgeryDraft>) => {
    setDrafts(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts(prev => prev.filter(item => item.id !== id));
  }, []);

  const currentValues = useMemo(() => drafts, [drafts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Surgeries</h3>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-sm"
          onClick={addSurgery}
        >
          Add surgery
        </button>
      </div>

      {currentValues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No surgeries recorded.</p>
      ) : null}

      <ul className="space-y-3">
        {currentValues.map(item => {
          const hasDateError = invalidDates.has(item.id);
          return (
            <li key={item.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <label className="flex-1 text-sm">
                  <span className="mb-1 block font-medium">Procedure</span>
                  <input
                    type="text"
                    value={item.procedure}
                    onChange={event => updateDraft(item.id, { procedure: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <label className="w-full text-sm md:w-48">
                  <span className="mb-1 block font-medium">Date</span>
                  <input
                    type="date"
                    value={item.dateInput}
                    onChange={event => updateDraft(item.id, { dateInput: event.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  {hasDateError ? (
                    <span className="mt-1 block text-xs text-destructive">Enter a valid date.</span>
                  ) : null}
                </label>
              </div>
              <label className="mt-3 block text-sm">
                <span className="mb-1 block font-medium">Notes</span>
                <textarea
                  value={item.notes ?? ""}
                  onChange={event => updateDraft(item.id, { notes: event.target.value })}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeDraft(item.id)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
