import Markdown from "@/components/Markdown";

export default function TrialsTable({
  payload,
  markdownFallback,
}: {
  payload: any;
  markdownFallback?: string;
}) {
  const rows = payload?.rows ?? [];
  if (!rows.length) return markdownFallback ? <Markdown text={markdownFallback} /> : null;
  return (
    <div className="overflow-x-auto border rounded-xl">
      <table className="w-full text-sm">
        <thead><tr>{payload.columns.map((c:any)=><th key={c.key} className="px-3 py-2 text-left">{c.label}</th>)}</tr></thead>
        <tbody>
        {rows.map((r:any, i:number)=>(
          <tr key={i} className="odd:bg-white even:bg-gray-50">
            <td className="px-3 py-2">{r.title?.href ? <a href={r.title.href} target="_blank" className="underline">{r.title.text}</a> : r.title?.text}</td>
            <td className="px-3 py-2">{r.phase}</td>
            <td className="px-3 py-2">{r.condition}</td>
            <td className="px-3 py-2">{r.intervention}</td>
            <td className="px-3 py-2">{r.status}</td>
            <td className="px-3 py-2">{r.country}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}
