"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { pushToast } from "@/lib/ui/toast";

type Suggestion = {
  name: string;
  rxnormId?: string | null;
};

export type MedicationInputProps = {
  onSave: (med: { name: string; dose?: string | null; rxnormId?: string | null }) => Promise<void> | void;
  placeholder?: string;
};

export default function MedicationInput({ onSave, placeholder = "Add a medication" }: MedicationInputProps) {
  const [query, setQuery] = useState("");
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [lockedSuggestion, setLockedSuggestion] = useState<Suggestion | null>(null);
  const [dose, setDose] = useState("");
  const [needsDose, setNeedsDose] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const name = lockedName ?? query.trim();
  const showSave = name.length >= 2;
  const trimmedDose = dose.trim();
  const shouldShowDoseInput = needsDose || !!lockedName || trimmedDose.length > 0 || showSave;

  useEffect(() => {
    if (!query.trim() || lockedName) {
      setSuggestions([]);
      setError(null);
      abortRef.current?.abort();
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const handle = window.setTimeout(() => {
      void fetchSuggestions(query.trim(), controller.signal)
        .then(list => {
          setSuggestions(list);
          setError(null);
        })
        .catch(err => {
          if (err.name === "AbortError") return;
          console.warn("Medication search failed", err);
          setError("Couldn’t fetch suggestions.");
          setSuggestions([]);
        })
        .finally(() => setLoading(false));
    }, 300);
    setLoading(true);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [lockedName, query]);

  const handleSave = async () => {
    if (!name) {
      setError("Enter a medication name.");
      return;
    }
    const finalDose = trimmedDose;
    if (!finalDose && !needsDose) {
      setNeedsDose(true);
      return;
    }
    try {
      await onSave({ name, dose: finalDose || null, rxnormId: lockedSuggestion?.rxnormId ?? null });
      setQuery("");
      setLockedName(null);
      setLockedSuggestion(null);
      setDose("");
      setNeedsDose(false);
      setSuggestions([]);
      setError(null);
      pushToast({ title: "Medication saved" });
    } catch (err: any) {
      console.error("Failed to save medication", err);
      pushToast({
        title: "Couldn’t save medication",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex-1">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Medication name</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder={placeholder}
              value={lockedName ?? query}
              onChange={e => {
                setLockedName(null);
                setLockedSuggestion(null);
                setQuery(e.target.value);
              }}
            />
          </label>
          {loading ? (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Searching suggestions…
            </p>
          ) : null}
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          {!loading && !lockedName && suggestions.length > 0 ? (
            <div className="mt-2 space-y-1 text-xs">
              <p className="font-medium text-muted-foreground">Did you mean…</p>
              <ul className="flex flex-wrap gap-1">
                {suggestions.slice(0, 5).map(s => (
                  <li key={`${s.rxnormId || s.name}`}>
                    <button
                      type="button"
                      className="rounded-full border px-3 py-1 hover:bg-muted"
                      onClick={() => {
                        setLockedName(s.name);
                        setLockedSuggestion(s);
                        setQuery(s.name);
                      }}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {shouldShowDoseInput ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Dose (enter 0 if not applicable)</span>
            <input
              className="rounded-md border px-3 py-2"
              placeholder="e.g. 500 mg or 0"
              value={dose}
              onChange={e => setDose(e.target.value)}
            />
          </label>
        ) : null}
        {showSave ? (
          <button
            type="button"
            className="inline-flex items-center justify-center self-start rounded-md border bg-primary px-3 py-2 text-sm text-primary-foreground shadow disabled:opacity-60"
            onClick={handleSave}
            disabled={loading}
          >
            Save
          </button>
        ) : null}
      </div>
      {needsDose && !trimmedDose ? (
        <p className="text-xs text-muted-foreground">Add a dose (enter 0 if not applicable) before saving.</p>
      ) : null}
    </div>
  );
}

async function fetchSuggestions(term: string, signal: AbortSignal): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  try {
    const searchRes = await fetch(`/api/meds/search?q=${encodeURIComponent(term)}`, { signal });
    if (searchRes.ok) {
      const json = await searchRes.json();
      const meds = Array.isArray(json?.meds) ? json.meds : [];
      for (const med of meds) {
        if (!med?.name) continue;
        suggestions.push({ name: String(med.name), rxnormId: med.rxnormId ?? null });
      }
      return dedupeSuggestions(suggestions);
    }
    if (searchRes.status !== 404) {
      throw new Error(`HTTP ${searchRes.status}`);
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") throw err;
    // fall through to normalization fallback
  }

  try {
    const normalizeUrl = `/api/rxnorm/normalize?name=${encodeURIComponent(term)}`;
    let normalizeRes = await fetch(normalizeUrl, { signal });
    if (normalizeRes.status === 405) {
      normalizeRes = await fetch("/api/rxnorm/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: term }),
        signal,
      });
    }
    if (!normalizeRes.ok) return [];
    const json = await normalizeRes.json();
    const meds = Array.isArray(json?.meds)
      ? json.meds
      : Array.isArray(json?.tokens)
      ? json.tokens
      : [];
    for (const med of meds) {
      if (typeof med === "string") {
        suggestions.push({ name: med });
      } else if (med?.name) {
        suggestions.push({ name: String(med.name), rxnormId: med.rxnormId ?? med.rxcui ?? null });
      } else if (med?.token) {
        suggestions.push({ name: String(med.token), rxnormId: med.rxcui ?? null });
      }
    }
    return dedupeSuggestions(suggestions);
  } catch (err) {
    if ((err as any)?.name === "AbortError") throw err;
    return [];
  }
}

function dedupeSuggestions(input: Suggestion[]): Suggestion[] {
  const map = new Map<string, Suggestion>();
  for (const item of input) {
    const key = item.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}
