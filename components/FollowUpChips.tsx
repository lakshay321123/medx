'use client';
export default function FollowUpChips({ items, onClick }: { items: string[]; onClick: (t:string)=>void }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((t, i)=>(
        <button key={i} onClick={()=>onClick(t)} className="px-3 py-1 text-sm rounded-full border">
          {t}
        </button>
      ))}
    </div>
  );
}
