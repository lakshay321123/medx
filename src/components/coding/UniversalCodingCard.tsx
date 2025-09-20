"use client";

import type { ReactNode } from "react";
import type { UniversalCodingAnswer, UniversalCodingMode } from "@/types/coding";

type UniversalCodingCardProps = {
  answer: UniversalCodingAnswer | null;
  mode: UniversalCodingMode;
  isLoading?: boolean;
  error?: string | null;
};

function SectionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm italic text-slate-500">No data.</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, idx) => (
        <li key={`${item}-${idx}`} className="whitespace-pre-line">{item}</li>
      ))}
    </ul>
  );
}

export function UniversalCodingCard({ answer, mode, isLoading, error }: UniversalCodingCardProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        Generating universal coding guidance…
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Provide a clinical scenario and choose Doctor or Doctor+Research mode to generate the Universal Coding Guide.
      </div>
    );
  }

  const { claimExample } = answer;

  return (
    <div className="grid gap-6">
      <SectionShell title="Quick Summary">
        <BulletList items={answer.quickSummary} />
      </SectionShell>

      <SectionShell title="Modifiers">
        <BulletList items={answer.modifiers} />
      </SectionShell>

      <SectionShell title="NCCI / Bundling">
        <BulletList items={answer.ncciBundlingBullets} />
      </SectionShell>

      <SectionShell title="Claim Example">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Dx Codes</h3>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{claimExample.dxCodes.join(", ")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-800/70">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">CPT</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">Modifiers</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">Dx Ptr</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">POS</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">Units</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-200">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {claimExample.claimLines.map((line, idx) => (
                  <tr key={`${line.cpt}-${idx}`} className="bg-white/70 dark:bg-slate-900/60">
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{line.cpt}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                      {line.modifiers?.length ? line.modifiers.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{line.dxPointers.join(", ")}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{line.pos}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{line.units}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{line.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {claimExample.authBox23 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-100">
              <span className="font-semibold">Box 23 / Prior Auth:</span> {claimExample.authBox23}
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell title="Checklist">
        <BulletList items={answer.checklist} />
      </SectionShell>

      {mode === "doctor+research" && (
        <div className="grid gap-6">
          <SectionShell title="Rationale">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {answer.rationale || ""}
            </p>
          </SectionShell>

          <SectionShell title="Payer Notes">
            <BulletList items={answer.payerNotes ?? []} />
          </SectionShell>

          <SectionShell title="ICD-10 Specificity">
            <BulletList items={answer.icdSpecificity ?? []} />
          </SectionShell>

          <SectionShell title="References">
            {answer.references?.length ? (
              <ul className="space-y-2 text-sm">
                {answer.references.map((ref, idx) => (
                  <li key={`${ref.title}-${idx}`} className="space-y-1">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{ref.title}</div>
                    {ref.url && (
                      <a
                        href={ref.url}
                        className="inline-block text-xs text-blue-600 hover:underline dark:text-blue-400"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ref.url}
                      </a>
                    )}
                    {ref.note && <p className="text-xs text-slate-500 dark:text-slate-400">{ref.note}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-slate-500">No references provided.</p>
            )}
          </SectionShell>
        </div>
      )}
    </div>
  );
}

export default UniversalCodingCard;
