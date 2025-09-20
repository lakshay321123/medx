import type { ReactNode } from "react";

import type { UniversalCodingAnswer } from "@/types/coding";

export default function UniversalCodingCard({ data }: { data: UniversalCodingAnswer }) {
  const dxCodes = data.claimExample?.dxCodes ?? [];
  const claimLines = data.claimExample?.claimLines ?? [];

  return (
    <div className="rounded-2xl border p-4 space-y-5">
      <Section title="Quick Coding Summary">
        <table className="w-full text-sm">
          <tbody>
            {(data.quickSummary || []).map((row, idx) => (
              <tr key={idx}>
                <td className="w-44 py-1 font-medium">{row.label}</td>
                <td className="py-1">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {!!data.modifiers?.length && (
        <Section title="Modifiers">
          <ul className="ml-5 list-disc">
            {data.modifiers.map((row, idx) => (
              <li key={idx}>
                <b>{row.modifier}</b> — {row.useCase}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!!data.ncciBundlingBullets?.length && (
        <Section title="NCCI / Bundling">
          <ul className="ml-5 list-disc">
            {data.ncciBundlingBullets.map((row, idx) => (
              <li key={idx}>{row}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Claim Example (CMS-1500 / 837P)">
        <div className="text-sm">
          <div className="mb-2">
            <b>Dx (Box 21):</b> {dxCodes.join(", ")}
          </div>
          <table className="w-full border text-sm">
            <thead>
              <tr>
                <th>CPT</th>
                <th>Modifiers</th>
                <th>Dx Ptr</th>
                <th>POS</th>
                <th>Units</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {claimLines.map((line, idx) => (
                <tr key={idx} className="border-t">
                  <td>{line.cpt}</td>
                  <td>{(line.modifiers || []).join("-")}</td>
                  <td>{(line.dxPointers || []).join(",")}</td>
                  <td>{line.pos || ""}</td>
                  <td>{line.units ?? 1}</td>
                  <td>{line.notes || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {!!data.claimExample?.authBox23 && (
        <Section title="Authorization">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <b>Box 23:</b> {data.claimExample.authBox23}
          </div>
        </Section>
      )}

      {!!data.checklist?.length && (
        <Section title="Checklist">
          <ul className="ml-5 list-disc">
            {data.checklist.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {data.rationale && <Section title="Coding Rationale">{data.rationale}</Section>}

      {!!data.payerNotes?.length && (
        <Section title="Payer Notes">
          <ul className="ml-5 list-disc">
            {data.payerNotes.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {!!data.icdSpecificity?.length && (
        <Section title="ICD-10 Specificity">
          <ul className="ml-5 list-disc">
            {data.icdSpecificity.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {!!data.references?.length && (
        <Section title="References">
          <ul className="ml-5 list-disc">
            {data.references.map((ref, idx) => (
              <li key={idx}>
                {ref.url ? (
                  <a href={ref.url} className="underline" target="_blank" rel="noreferrer">
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
    <section>
      <h3 className="mb-2 font-semibold">{title}</h3>
      {children}
    </section>
  );
}
