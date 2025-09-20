import { type ReactNode, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { UniversalCodingAnswer, UniversalCodingClaimLine } from '@/types/coding';

interface UniversalCodingCardProps {
  data: UniversalCodingAnswer;
}

function formatCharge(charge: UniversalCodingClaimLine['charge']): string | null {
  if (typeof charge !== 'number' || Number.isNaN(charge)) {
    return null;
  }
  return `$${charge.toFixed(2)}`;
}

function formatDxPointers(dxPointers: UniversalCodingClaimLine['dxPointers']): string {
  if (!dxPointers || dxPointers.length === 0) {
    return '—';
  }
  return dxPointers.map((pointer) => pointer.toString()).join(', ');
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-800"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '-rotate-180' : 'rotate-0'}`} />
      </button>
      {open ? <div className="border-t border-slate-200 px-3 py-2 text-sm leading-6 text-slate-700">{children}</div> : null}
    </div>
  );
}

function maybeRenderCollapsible(
  title: string,
  content: ReactNode,
  defaultOpen: boolean
): ReactNode {
  if (!content) return null;
  return <CollapsibleSection title={title} defaultOpen={defaultOpen}>{content}</CollapsibleSection>;
}

export function UniversalCodingCard({ data }: UniversalCodingCardProps) {
  const { quickSummary, modifiers, ncciBundlingBullets, claimExample, checklist, mode } = data;
  const isResearch = mode === 'doctor_research';

  const modifiersContent = useMemo(() => {
    if (!modifiers.length) return null;
    return (
      <ul className="space-y-1">
        {modifiers.map((item) => (
          <li key={item.modifier} className="flex flex-col rounded-md bg-slate-50 px-3 py-2 text-slate-700">
            <span className="font-semibold text-slate-900">{item.modifier}</span>
            <span className="text-sm">{item.useCase}</span>
          </li>
        ))}
      </ul>
    );
  }, [modifiers]);

  const bundlingContent = useMemo(() => {
    if (!ncciBundlingBullets.length) return null;
    return (
      <ul className="list-disc space-y-1 pl-4">
        {ncciBundlingBullets.map((bullet, index) => (
          <li key={index}>{bullet}</li>
        ))}
      </ul>
    );
  }, [ncciBundlingBullets]);

  const checklistContent = useMemo(() => {
    if (!checklist.length) return null;
    return (
      <ul className="list-disc space-y-1 pl-4">
        {checklist.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }, [checklist]);

  const payerNotes = data.payerNotes ?? [];
  const payerNotesContent = useMemo(() => {
    if (!payerNotes.length) return null;
    return (
      <ul className="list-disc space-y-1 pl-4">
        {payerNotes.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }, [payerNotes]);

  const icdSpecificity = data.icdSpecificity ?? [];
  const icdContent = useMemo(() => {
    if (!icdSpecificity.length) return null;
    return (
      <ul className="list-disc space-y-1 pl-4">
        {icdSpecificity.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }, [icdSpecificity]);

  const references = data.references ?? [];
  const referencesContent = useMemo(() => {
    if (!references.length) return null;
    return (
      <ul className="space-y-1">
        {references.map((reference, index) => {
          const href = reference.url && /^(https?:)/i.test(reference.url) ? reference.url : undefined;
          return (
            <li key={`${reference.label}-${reference.url ?? index}`}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline decoration-blue-400 decoration-2 underline-offset-4 hover:text-blue-700"
                >
                  {reference.label}
                </a>
              ) : (
                <span>{reference.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }, [references]);

  const claimLines = useMemo(() => {
    if (!claimExample.claimLines.length) return null;
    return (
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">CPT</th>
              <th className="px-3 py-2">Mods</th>
              <th className="px-3 py-2">Dx Ptr</th>
              <th className="px-3 py-2">POS</th>
              <th className="px-3 py-2">Units</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {claimExample.claimLines.map((line, index) => {
              const formattedCharge = formatCharge(line.charge ?? undefined);
              const notesParts = [line.notes];
              if (formattedCharge) {
                notesParts.push(`Charge ${formattedCharge}`);
              }
              return (
                <tr key={`${line.cpt}-${index}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">{line.cpt}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {line.modifiers && line.modifiers.length > 0 ? line.modifiers.join(', ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDxPointers(line.dxPointers)}</td>
                  <td className="px-3 py-2 text-slate-700">{line.pos ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{line.units ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{notesParts.filter(Boolean).join(' • ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [claimExample.claimLines]);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      {quickSummary.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Quick Coding Summary</h2>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full text-sm">
              <tbody>
                {quickSummary.map((item) => (
                  <tr key={`${item.label}-${item.value}`} className="border-t border-slate-200 first:border-t-0">
                    <th className="w-40 bg-slate-50 px-3 py-2 text-left text-slate-600">{item.label}</th>
                    <td className="px-3 py-2 text-slate-900">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {maybeRenderCollapsible('Modifiers', modifiersContent, mode === 'doctor')}
      {maybeRenderCollapsible('NCCI / Bundling', bundlingContent, mode === 'doctor')}

      {(claimExample.dxCodes.length > 0 || claimLines) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Claim Example (CMS-1500 / 837P)</h2>
          <div className="text-sm text-slate-700">
            {claimExample.dxCodes.length > 0 ? (
              <div>
                <span className="font-medium text-slate-900">Dx:</span> {claimExample.dxCodes.join(', ')}
              </div>
            ) : null}
            {claimExample.authBox23 ? (
              <div>
                <span className="font-medium text-slate-900">Auth:</span> {claimExample.authBox23}
              </div>
            ) : null}
          </div>
          {claimLines}
        </div>
      )}

      {maybeRenderCollapsible('Checklist', checklistContent, false)}

      {isResearch && data.rationale ? (
        <div>
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Rationale</h2>
          <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-700">{data.rationale}</p>
        </div>
      ) : null}

      {isResearch ? maybeRenderCollapsible('Payer Notes', payerNotesContent, true) : null}
      {isResearch ? maybeRenderCollapsible('ICD-10 Specificity', icdContent, false) : null}
      {isResearch ? maybeRenderCollapsible('References', referencesContent, false) : null}
    </div>
  );
}
