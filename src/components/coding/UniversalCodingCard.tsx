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

export function UniversalCodingCard({ data }: UniversalCodingCardProps) {
  const { quickSummary, modifiers, ncciBundlingBullets, claimExample, checklist, mode } = data;
  const isResearch = mode === 'doctor_research';

  return (
    <div className="space-y-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Coding Summary</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <tbody className="divide-y divide-neutral-200">
              {quickSummary.map((item) => (
                <tr key={`${item.label}-${item.value}`} className="bg-white">
                  <th scope="row" className="w-1/3 bg-neutral-50 px-4 py-3 text-left font-medium text-neutral-600">
                    {item.label}
                  </th>
                  <td className="px-4 py-3 text-neutral-900">
                    <div className="font-medium">{item.value}</div>
                    {item.notes ? (
                      <p className="mt-1 text-sm text-neutral-600">{item.notes}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Modifiers</h2>
        {modifiers.length > 0 ? (
          <ul className="space-y-2 text-sm text-neutral-800">
            {modifiers.map((item) => (
              <li key={item.modifier} className="rounded-md border border-neutral-200 px-3 py-2">
                <div className="font-semibold">{item.modifier}</div>
                <p className="mt-1 text-neutral-600">{item.useCase}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No modifier recommendations for this scenario.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">NCCI / Bundling</h2>
        {ncciBundlingBullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-800">
            {ncciBundlingBullets.map((bullet, index) => (
              <li key={index}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No common bundling edits identified.</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Claim Example (CMS-1500 / 837P)</h2>
        <div className="space-y-2 text-sm text-neutral-800">
          <div>
            <span className="font-semibold">ICD-10-CM (Box 21):</span>{' '}
            {claimExample.dxCodes.length > 0 ? claimExample.dxCodes.join(', ') : 'No diagnosis codes provided.'}
          </div>
          {claimExample.authBox23 ? (
            <div>
              <span className="font-semibold">Box 23 (Auth):</span> {claimExample.authBox23}
            </div>
          ) : null}
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left font-medium text-neutral-600">
              <tr>
                <th className="px-4 py-2">CPT/HCPCS</th>
                <th className="px-4 py-2">Modifiers</th>
                <th className="px-4 py-2">Dx Ptrs</th>
                <th className="px-4 py-2">POS</th>
                <th className="px-4 py-2">Units</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {claimExample.claimLines.map((line, index) => {
                const formattedCharge = formatCharge(line.charge);
                return (
                  <tr key={`${line.cpt}-${index}`} className="bg-white">
                    <td className="px-4 py-2 font-medium text-neutral-900">{line.cpt}</td>
                    <td className="px-4 py-2 text-neutral-700">
                      {line.modifiers && line.modifiers.length > 0 ? line.modifiers.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-2 text-neutral-700">
                      {line.dxPointers && line.dxPointers.length > 0 ? line.dxPointers.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-2 text-neutral-700">{line.pos}</td>
                    <td className="px-4 py-2 text-neutral-700">{line.units}</td>
                    <td className="px-4 py-2 text-neutral-700">{line.notes ?? '—'}</td>
                    <td className="px-4 py-2 text-neutral-700">{formattedCharge ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Checklist</h2>
        {checklist.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-800">
            {checklist.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-600">No additional checklist items.</p>
        )}
      </section>

      {isResearch ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Rationale</h2>
            <p className="text-sm text-neutral-800">{data.rationale}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Payer Notes</h2>
            {data.payerNotes.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-800">
                {data.payerNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-600">No payer-specific notes provided.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">ICD-10 Specificity</h2>
            {data.icdSpecificity.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-800">
                {data.icdSpecificity.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-600">No ICD-10 specificity reminders provided.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">References</h2>
            {data.references.length > 0 ? (
              <ul className="space-y-2 text-sm text-neutral-800">
                {data.references.map((reference) => (
                  <li key={`${reference.label}-${reference.url}`}>
                    <a
                      href={reference.url}
                      className="text-blue-600 underline decoration-blue-400 decoration-2 underline-offset-4 hover:text-blue-700"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {reference.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-600">No references provided.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
