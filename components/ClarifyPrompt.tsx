"use client";

export default function ClarifyPrompt({
  options,
  onSelect,
}: {
  options: { threadId: string; title: string; similarity: number }[];
  onSelect: (threadId: string) => void;
}) {
  return (
    <div className="p-3 border rounded bg-yellow-50 text-sm">
      <p>Did you mean to continue with one of these topics?</p>
      <ul className="mt-2 space-y-1">
        {options.map((o) => (
          <li key={o.threadId}>
            <button
              className="px-2 py-1 rounded bg-white border"
              onClick={() => onSelect(o.threadId)}
            >
              {o.title} ({Math.round(o.similarity * 100)}%)
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
