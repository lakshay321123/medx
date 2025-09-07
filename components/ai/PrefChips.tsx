export function PrefChips({ prefs }: { prefs: {key:string; value:string}[] }) {
  if (!prefs?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prefs.map((p, i) => (
        <span key={i} className="rounded-full border px-3 py-1 text-xs">
          {p.key.replace(/^pref_/, "").replace(/_/g, " ")}: <b>{p.value}</b>
        </span>
      ))}
    </div>
  );
}
