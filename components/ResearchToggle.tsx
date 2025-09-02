"use client";
import { useEffect, useState } from "react";

export function ResearchToggle({ defaultOn=false, onChange }:{defaultOn?:boolean;onChange?:(v:boolean)=>void}) {
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(defaultOn);
  useEffect(()=>setMounted(true),[]);
  if (!mounted) return null;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={()=>{ const v=!on; setOn(v); onChange?.(v); }}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus-ring
        ${on
          ? "bg-emerald-100 text-emerald-900 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
          : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"}`}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${on?"bg-emerald-500":"bg-slate-400"}`} />
      {on ? "Research On" : "Research Off"}
    </button>
  );
}
