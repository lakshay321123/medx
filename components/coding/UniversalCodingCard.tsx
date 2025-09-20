import type { ReactNode } from 'react';

import { UniversalCodingAnswer } from '@/types/coding';

export default function UniversalCodingCard({ data }: { data: UniversalCodingAnswer }) {
  return (
    <div className="rounded-2xl border p-6 space-y-6 bg-background text-sm">
      <Section title="Quick Summary">
        <table className="w-full border-separate border-spacing-y-1">
          <tbody>
            {(data.quickSummary || []).map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td className="w-48 font-semibold align-top text-xs uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </td>
                <td className="py-1 text-sm">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Modifiers">
        {data.modifiers?.length ? (
          <table className="w-full border text-left">
            <thead>
              <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 w-32">Modifier</th>
                <th className="px-3 py-2">Use Case</th>
              </tr>
            </thead>
            <tbody>
              {data.modifiers.map((row, index) => (
                <tr key={`${row.modifier}-${index}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.modifier}</td>
                  <td className="px-3 py-2">{row.useCase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground">No routine modifiers indicated.</p>
        )}
      </Section>

      <Section title="NCCI Rules">
        {data.ncciBundlingBullets?.length ? (
          <ul className="list-disc space-y-1 pl-6">
            {data.ncciBundlingBullets.map((bullet, index) => (
              <li key={`${bullet}-${index}`}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No bundling edits noted.</p>
        )}
      </Section>

      <Section title="Claim Example">
        <div className="space-y-2">
          <div>
            <b>Dx (Box 21):</b> {data.claimExample?.dxCodes?.join(', ') || '—'}
          </div>
          {data.claimExample?.authBox23 && (
            <div>
              <b>Auth (Box 23):</b> {data.claimExample.authBox23}
            </div>
          )}
          <table className="w-full border text-left">
            <thead>
              <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">CPT/HCPCS</th>
                <th className="px-3 py-2">Modifiers</th>
                <th className="px-3 py-2">Dx Ptr</th>
                <th className="px-3 py-2">POS</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Charge</th>
                <th className="px-3 py-2">Notes (Box 19)</th>
              </tr>
            </thead>
            <tbody>
              {(data.claimExample?.claimLines || []).map((line, index) => (
                <tr key={`${line.cpt}-${index}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{line.cpt}</td>
                  <td className="px-3 py-2">{(line.modifiers || []).join('-') || '—'}</td>
                  <td className="px-3 py-2">{(line.dxPointers || []).join(',') || '—'}</td>
                  <td className="px-3 py-2">{line.pos || '—'}</td>
                  <td className="px-3 py-2">{line.units ?? 1}</td>
                  <td className="px-3 py-2">{line.charge ?? '—'}</td>
                  <td className="px-3 py-2">{line.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Checklist">
        {data.checklist?.length ? (
          <ul className="list-disc space-y-1 pl-6">
            {data.checklist.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No checklist items provided.</p>
        )}
      </Section>

      {data.rationale && <Section title="Rationale"><p>{data.rationale}</p></Section>}

      {!!data.payerNotes?.length && (
        <Section title="Payer Notes">
          <ul className="list-disc space-y-1 pl-6">
            {data.payerNotes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </Section>
      )}

      {!!data.icdSpecificity?.length && (
        <Section title="ICD-10 Specificity">
          <ul className="list-disc space-y-1 pl-6">
            {data.icdSpecificity.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </Section>
      )}

      {!!data.references?.length && (
        <Section title="References">
          <ul className="list-disc space-y-1 pl-6">
            {data.references.map((ref, index) => (
              <li key={`${ref.label}-${index}`}>
                {ref.url ? (
                  <a href={ref.url} target="_blank" rel="noreferrer" className="underline">
                    {ref.label}
                  </a>
                ) : (
                  ref.label
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
