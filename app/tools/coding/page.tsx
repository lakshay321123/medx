'use client';

import { useState } from 'react';

import UniversalCodingCard from '@/components/coding/UniversalCodingCard';
import { generateUniversalAnswer } from '@/lib/coding/generateUniversalAnswer';
import type { CodingMode, UniversalCodingAnswer } from '@/types/coding';

export default function CodingToolPage() {
  const [data, setData] = useState<UniversalCodingAnswer | null>(null);
  const [mode, setMode] = useState<CodingMode>('doctor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(nextMode: CodingMode) {
    setIsLoading(true);
    setError(null);
    setMode(nextMode);
    try {
      const input = collectForm();
      const result = await generateUniversalAnswer(input, nextMode);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate coding guidance.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Universal Coding Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Provide clinical and billing context below, then generate a professional CMS-1500 oriented coding guide.
        </p>
      </div>

      <form id="coding-form" className="space-y-4 rounded-2xl border bg-background p-4 shadow-sm">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Case summary</span>
          <textarea
            name="caseSummary"
            rows={4}
            className="w-full rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring"
            placeholder="Summarize the encounter, provider type, services performed, clinical findings, and payer requirements."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Place of service</span>
            <input
              name="placeOfService"
              type="text"
              className="w-full rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring"
              placeholder="e.g., 11, 21, 24"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Primary diagnosis</span>
            <input
              name="primaryDiagnosis"
              type="text"
              className="w-full rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring"
              placeholder="ICD-10-CM code or description"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Procedures performed</span>
            <input
              name="procedures"
              type="text"
              className="w-full rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring"
              placeholder="List CPT/HCPCS or describe services"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Payer/policy notes</span>
            <input
              name="payerNotes"
              type="text"
              className="w-full rounded-lg border bg-background p-2 text-sm focus:outline-none focus:ring"
              placeholder="Authorization, frequency limits, medical necessity"
            />
          </label>
        </div>
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run('doctor')}
          className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading && mode === 'doctor' ? 'Generating…' : 'Doctor Mode'}
        </button>
        <button
          type="button"
          onClick={() => run('doctor_research')}
          className="rounded-lg border border-primary/60 bg-background px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-muted disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading && mode === 'doctor_research' ? 'Generating…' : 'Doctor + Research'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {isLoading && !error && <div className="text-sm text-muted-foreground">Asking the coding assistant…</div>}

      {data && !isLoading && !error && <UniversalCodingCard data={data} />}
    </div>
  );
}

function collectForm(): Record<string, any> {
  if (typeof document === 'undefined') return {};
  const form = document.getElementById('coding-form') as HTMLFormElement | null;
  if (!form) return {};
  const formData = new FormData(form);
  const input: Record<string, any> = {};
  formData.forEach((value, key) => {
    if (key in input) {
      const existing = input[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        input[key] = [existing, value];
      }
    } else {
      input[key] = value;
    }
  });
  return input;
}
