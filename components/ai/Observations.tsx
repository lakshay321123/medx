export function Observations({ shortText, longText }: { shortText?: string; longText?: string }) {
  if (!shortText && !longText) return null;
  return (
    <div className="rounded-xl border p-3">
      {shortText && <div className="text-sm font-medium">{shortText}</div>}
      {longText && <pre className="whitespace-pre-wrap text-sm mt-2">{longText}</pre>}
    </div>
  );
}
