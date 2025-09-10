type Data = {
  title: string;
  summary: Record<string, string>;
  legal: string;
  references?: string[];
};
export default function MedicationCard({ data }: { data: Data }) {
  const s = data.summary;
  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <div className="text-lg font-semibold">{data.title}</div>
      <ul className="text-sm leading-6">
        {Object.entries(s).map(([k, v]) => v ? <li key={k}><b>{k}:</b> {v}</li> : null)}
      </ul>
      <p className="text-xs text-neutral-500">{data.legal}</p>
      {data.references?.length ? (
        <div className="pt-2">
          <div className="text-xs font-medium">References</div>
          <ul className="text-xs list-disc pl-5">
            {data.references.map((u, i) => (<li key={i}><a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
