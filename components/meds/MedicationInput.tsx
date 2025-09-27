"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { pushToast } from "@/lib/ui/toast";
import { useCountry } from "@/lib/country";

type Suggestion = {
  name: string;
  rxnormId?: string | null;
};

type SuggestionResult = {
  suggestions: Suggestion[];
  normalized: Suggestion | null;
};

export type MedicationInputProps = {
  onSave: (med: { name: string; dose?: string | null; rxnormId?: string | null }) => Promise<void> | void;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function MedicationInput({
  onSave,
  placeholder = "Add a medication",
  autoFocus = false,
}: MedicationInputProps) {
  const { country } = useCountry();
  const [query, setQuery] = useState("");
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [lockedSuggestion, setLockedSuggestion] = useState<Suggestion | null>(null);
  const [dose, setDose] = useState("");
  const [needsDose, setNeedsDose] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [normalizedSuggestion, setNormalizedSuggestion] = useState<Suggestion | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();
  const name = lockedName ?? trimmedQuery;
  const trimmedDose = dose.trim();
  const confirmedSuggestion =
    lockedSuggestion ??
    (normalizedSuggestion && normalizedSuggestion.name.toLowerCase() === name.toLowerCase()
      ? normalizedSuggestion
      : null);
  const canSaveName = (confirmedSuggestion?.name ?? name).trim().length > 0;
  const showSave = canSaveName;
  const shouldShowDoseInput = needsDose || !!lockedName || trimmedDose.length > 0 || showSave;
  const listOpen = useMemo(() => !lockedName && suggestions.length > 0, [lockedName, suggestions.length]);
  const displaySuggestions = useMemo(() => suggestions.slice(0, 5), [suggestions]);
  useEffect(() => {
    if (!listOpen) {
      setHighlightIndex(0);
    } else if (highlightIndex >= displaySuggestions.length) {
      setHighlightIndex(0);
    }
  }, [displaySuggestions.length, highlightIndex, listOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (lockedName) {
      abortRef.current?.abort();
      setSuggestions([]);
      setNormalizedSuggestion(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (trimmed.length < 2) {
      abortRef.current?.abort();
      setSuggestions([]);
      setNormalizedSuggestion(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const handle = window.setTimeout(() => {
      const countryCode = country.code2 || country.code3 || "";
      void fetchSuggestions(trimmed, controller.signal, countryCode || undefined)
        .then(result => {
          setSuggestions(result.suggestions);
          setNormalizedSuggestion(result.normalized);
          setHighlightIndex(0);
          setError(null);
        })
        .catch(err => {
          if (err.name === "AbortError") return;
          console.warn("Medication search failed", err);
          setError("Couldn’t fetch suggestions.");
          setSuggestions([]);
          setNormalizedSuggestion(null);
        })
        .finally(() => setLoading(false));
    }, 300);
    setLoading(true);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [country.code2, country.code3, lockedName, query]);

  const selectSuggestion = (suggestion: Suggestion) => {
    setLockedName(suggestion.name);
    setLockedSuggestion(suggestion);
    setQuery(suggestion.name);
    setSuggestions([]);
    setNormalizedSuggestion(null);
    setHighlightIndex(0);
  };

  const handleSave = async () => {
    if (!name) {
      setError("Enter a medication name.");
      return;
    }
    const source = confirmedSuggestion;
    const finalDose = trimmedDose;
    const isZeroDose = /^0+(\.0+)?$/.test(finalDose);
    if (!finalDose && !isZeroDose && !needsDose) {
      setNeedsDose(true);
      return;
    }
    try {
      const finalName = (source?.name ?? name).trim();
      if (!finalName) {
        setError("Enter a medication name.");
        return;
      }
      await onSave({ name: finalName, dose: finalDose || null, rxnormId: source?.rxnormId ?? null });
      setQuery("");
      setLockedName(null);
      setLockedSuggestion(null);
      setNormalizedSuggestion(null);
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
    <div className="space-y-2.5 md:space-y-3">
      <div className="flex flex-col gap-2.5 md:gap-3">
        <div className="flex-1">
          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-xs font-medium text-muted-foreground">Medication name</span>
            <input
              className="h-10 w-full rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
              placeholder={placeholder}
              value={lockedName ?? query}
              onChange={e => {
                setLockedName(null);
                setLockedSuggestion(null);
                setNormalizedSuggestion(null);
                setQuery(e.target.value);
                setError(null);
              }}
              autoFocus={autoFocus}
              onKeyDown={event => {
                if (!listOpen || displaySuggestions.length === 0) {
                  if (event.key === "Enter" && showSave) {
                    event.preventDefault();
                    void handleSave();
                  }
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightIndex(index => (index + 1) % displaySuggestions.length);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightIndex(index => (index - 1 + displaySuggestions.length) % displaySuggestions.length);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const suggestion = displaySuggestions[highlightIndex];
                  if (suggestion) {
                    selectSuggestion(suggestion);
                  }
                  return;
                }
                if (event.key === "Escape") {
                  setSuggestions([]);
                  setHighlightIndex(0);
                }
              }}
            />
          </label>
          {loading ? (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Searching suggestions…
            </p>
          ) : null}
          {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
          {!loading && listOpen && displaySuggestions.length > 0 ? (
            <div className="mt-2 space-y-1 text-[12px]">
              <p className="font-medium text-muted-foreground">Did you mean…</p>
              <ul className="flex flex-wrap gap-1.5">
                {displaySuggestions.map((s, index) => (
                  <li key={`${s.rxnormId || s.name}`}>
                    <button
                      type="button"
                      className={`inline-flex h-6 items-center rounded-full border border-border/70 px-2.5 text-[11px] font-medium transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40 ${
                        highlightIndex === index ? "bg-muted/70" : ""
                      }`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectSuggestion(s)}
                    >
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!loading && !lockedName && !listOpen && confirmedSuggestion ? (
            <p className="mt-1 text-xs text-muted-foreground">{`Confirmed as ${confirmedSuggestion.name}.`}</p>
          ) : null}
        </div>
        {shouldShowDoseInput ? (
          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-xs font-medium text-muted-foreground">Dose (enter 0 if not applicable)</span>
            <input
              className="h-10 rounded-[10px] border border-border/70 bg-background px-3 text-[13px] leading-tight shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-border/40"
              placeholder="e.g. 500 mg or 0"
              value={dose}
              onChange={e => setDose(e.target.value)}
            />
          </label>
        ) : null}
        {showSave ? (
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center self-start rounded-[10px] border border-primary/70 bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60 md:px-3"
            onClick={handleSave}
            disabled={loading || !showSave}
          >
            Save
          </button>
        ) : null}
      </div>
      {needsDose && !trimmedDose ? (
        <p className="text-[11px] text-muted-foreground">Add a dose (enter 0 if not applicable) before saving.</p>
      ) : null}
    </div>
  );
}

async function fetchSuggestions(
  term: string,
  signal: AbortSignal,
  countryCode?: string,
): Promise<SuggestionResult> {
  const suggestions: Suggestion[] = [];
  let normalized: Suggestion | null = null;
  try {
    const params = new URLSearchParams({ q: term });
    if (countryCode) params.set("country", countryCode);
    const searchRes = await fetch(`/api/meds/search?${params.toString()}`, { signal });
    if (searchRes.ok) {
      const json = await searchRes.json();
      const meds = Array.isArray(json?.meds) ? json.meds : [];
      for (const med of meds) {
        if (!med?.name) continue;
        const suggestion: Suggestion = { name: String(med.name), rxnormId: med.rxnormId ?? null };
        suggestions.push(suggestion);
        if (!normalized && suggestion.name.toLowerCase() === term.toLowerCase()) {
          normalized = suggestion;
        }
      }
      const deduped = dedupeSuggestions(suggestions);
      if (!normalized) {
        normalized = deduped.find(item => item.name.toLowerCase() === term.toLowerCase()) ?? null;
      }
      return { suggestions: deduped, normalized };
    }
    if (searchRes.status !== 404) {
      throw new Error(`HTTP ${searchRes.status}`);
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") throw err;
    // fall through to normalization fallback
  }

  try {
    const normalizeParams = new URLSearchParams({ name: term });
    if (countryCode) normalizeParams.set("country", countryCode);
    const normalizeUrl = `/api/rxnorm/normalize?${normalizeParams.toString()}`;
    let normalizeRes = await fetch(normalizeUrl, { signal });
    if (normalizeRes.status === 405) {
      normalizeRes = await fetch("/api/rxnorm/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: term, country: countryCode || undefined }),
        signal,
      });
    }
    if (!normalizeRes.ok) return { suggestions: [], normalized: null };
    const json = await normalizeRes.json();
    const meds = Array.isArray(json?.meds)
      ? json.meds
      : Array.isArray(json?.tokens)
      ? json.tokens
      : [];
    for (const med of meds) {
      if (typeof med === "string") {
        const suggestion: Suggestion = { name: med };
        suggestions.push(suggestion);
        if (!normalized && med.toLowerCase() === term.toLowerCase()) {
          normalized = suggestion;
        }
      } else if (med?.name) {
        const suggestion: Suggestion = {
          name: String(med.name),
          rxnormId: med.rxnormId ?? med.rxcui ?? null,
        };
        suggestions.push(suggestion);
        if (!normalized && suggestion.name.toLowerCase() === term.toLowerCase()) {
          normalized = suggestion;
        }
      } else if (med?.token) {
        const suggestion: Suggestion = {
          name: String(med.token),
          rxnormId: med.rxcui ?? null,
        };
        suggestions.push(suggestion);
        if (!normalized && suggestion.name.toLowerCase() === term.toLowerCase()) {
          normalized = suggestion;
        }
      }
    }
    const deduped = dedupeSuggestions(suggestions);
    if (!normalized) {
      normalized = deduped.find(item => item.name.toLowerCase() === term.toLowerCase()) ?? null;
    }
    return { suggestions: deduped, normalized };
  } catch (err) {
    if ((err as any)?.name === "AbortError") throw err;
    return { suggestions: [], normalized: null };
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
