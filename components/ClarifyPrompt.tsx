"use client";

export default function ClarifyPrompt({
  options,
  onSelect,
  onStartNew,
}: {
  options: { threadId: string; title: string; similarity: number }[];
  onSelect: (threadId: string) => void;
  onStartNew: () => void;
}) {
  return (
    <div className="p-3 border rounded bg-yellow-50 text-sm space-y-2">
      <p className="font-medium">I’m not fully sure which topic you meant—pick one:</p>
      <ul className="space-y-1">
        {options.map((o) => (
          <li key={o.threadId}>
            <button
              className="px-2 py-1 rounded bg-white border hover:bg-gray-50"
              onClick={() => onSelect(o.threadId)}
              title={`Match confidence: ${Math.round(o.similarity * 100)}%`}
            >
              {o.title} — {Math.round(o.similarity * 100)}%
            </button>
          </li>
        ))}
      </ul>
      <div className="pt-1">
        <button
          className="px-2 py-1 rounded border"
          onClick={onStartNew}
          title="Start a fresh topic"
        >
          Start new topic
        </button>
      </div>
    </div>
  );
}

