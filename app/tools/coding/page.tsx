"use client";

import { useMemo, useState } from "react";

import UniversalCodingCard from "@/components/coding/UniversalCodingCard";
import { generateUniversalAnswer } from "@/lib/coding/generateUniversalAnswer";
import type { CodingMode, UniversalCodingAnswer } from "@/types/coding";

const FEATURE_ENABLED = [
  process.env.NEXT_PUBLIC_FEATURE_CODING_GUIDE,
  process.env.FEATURE_CODING_GUIDE,
]
  .filter((value): value is string => Boolean(value))
  .some((value) => value === "1" || value.toLowerCase() === "true");

export default function CodingToolPage() {
  const [rawInput, setRawInput] = useState("{}");
  const [data, setData] = useState<UniversalCodingAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPreview = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(rawInput), null, 2);
    } catch {
      return rawInput.trim();
    }
  }, [rawInput]);

  const collectForm = (): Record<string, any> => {
    const trimmed = rawInput.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      return { narrative: trimmed };
    }
  };

  const run = async (mode: CodingMode) => {
    if (!FEATURE_ENABLED) return;
    setLoading(true);
    setError(null);
    try {
      const input = collectForm();
      const result = await generateUniversalAnswer(input, mode);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate coding guidance.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!FEATURE_ENABLED) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Coding guide is disabled. Set FEATURE_CODING_GUIDE=1 to enable Doctor and Doctor+Research modes.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Case details</label>
        <textarea
          className="h-40 w-full rounded-lg border p-2 font-mono text-sm"
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Paste JSON or free text. If not JSON, content is wrapped under a "narrative" key before sending to the model.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={loading} onClick={() => run("doctor")}>Doctor Mode</button>
        <button className="btn" disabled={loading} onClick={() => run("doctor_research")}>Doctor + Research</button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading && (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Generating coding guidance…</div>
      )}

      {data && !loading && <UniversalCodingCard data={data} />}

      <div className="rounded-md border p-3 text-xs text-muted-foreground">
        <div className="font-semibold">Preview payload</div>
        <pre className="whitespace-pre-wrap break-words">{parsedPreview}</pre>
      </div>
    </div>
  );
}
