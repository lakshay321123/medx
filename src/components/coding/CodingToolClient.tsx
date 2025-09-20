"use client";

import { type ChangeEvent, useState, useTransition } from "react";
import UniversalCodingCard from "@/components/coding/UniversalCodingCard";
import type {
  CodingCaseInput,
  UniversalCodingAnswer,
  UniversalCodingMode,
} from "@/types/coding";

type CodingToolClientProps = {
  onGenerate: (input: CodingCaseInput, mode: UniversalCodingMode) => Promise<UniversalCodingAnswer>;
};

const defaultInput: CodingCaseInput = {
  scenario: "",
  specialty: "",
  placeOfService: "",
  payer: "",
  additionalNotes: "",
};

export default function CodingToolClient({ onGenerate }: CodingToolClientProps) {
  const [formState, setFormState] = useState<CodingCaseInput>({ ...defaultInput });
  const [activeMode, setActiveMode] = useState<UniversalCodingMode>("doctor");
  const [result, setResult] = useState<UniversalCodingAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (key: keyof CodingCaseInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (mode: UniversalCodingMode) => {
    if (!formState.scenario.trim()) {
      setError("Please provide a clinical scenario before requesting coding guidance.");
      return;
    }
    startTransition(() => {
      setError(null);
      onGenerate(formState, mode)
        .then((answer) => {
          setResult(answer);
          setActiveMode(mode);
        })
        .catch((err) => {
          console.error("[coding-tool]", err);
          setError(err?.message || "Unable to generate coding guidance.");
        });
    });
  };

  const reset = () => {
    setFormState({ ...defaultInput });
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16">
      <div className="rounded-xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Universal Coding Guide</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Capture the chart scenario, then choose Doctor for a concise summary or Doctor+Research for policy-backed depth.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Specialty</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Orthopedics, Cardiology, GI…"
              value={formState.specialty ?? ""}
              onChange={handleChange("specialty")}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Place of Service</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="11, 21, 22, etc."
              value={formState.placeOfService ?? ""}
              onChange={handleChange("placeOfService")}
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Clinical Scenario</span>
            <textarea
              className="min-h-[140px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Summarize the encounter, diagnoses, laterality, procedure details, and patient context."
              value={formState.scenario}
              onChange={handleChange("scenario")}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Payer Focus</span>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Medicare, BCBS of Texas, etc."
              value={formState.payer ?? ""}
              onChange={handleChange("payer")}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">Additional Notes</span>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="Documentation specifics, implants, prior auth numbers, payer quirks…"
              value={formState.additionalNotes ?? ""}
              onChange={handleChange("additionalNotes")}
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-blue-400"
            onClick={() => submit("doctor")}
            disabled={isPending}
          >
            Doctor Mode
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:cursor-not-allowed disabled:bg-purple-400"
            onClick={() => submit("doctor+research")}
            disabled={isPending}
          >
            Doctor+Research Mode
          </button>
          <button
            type="button"
            className="ml-auto inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={reset}
            disabled={isPending}
          >
            Reset
          </button>
          {isPending && <span className="text-xs text-slate-500">Working…</span>}
        </div>
      </div>

      <UniversalCodingCard answer={result} mode={activeMode} isLoading={isPending} error={error} />
    </div>
  );
}
