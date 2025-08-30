'use client';

export default function FollowUpChips({
  items,
  onClick,
}: {
  items: Array<{ id: string; label: string }>;
  onClick: (id: string, label?: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onClick(it.id, it.label)}
          className="px-3 py-1 text-sm rounded-full border"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

