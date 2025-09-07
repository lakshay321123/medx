"use client";
import { useEffect, useState } from "react";

export function ResearchToggle({ defaultOn=false, onChange }:{defaultOn?:boolean; onChange?:(v:boolean)=>void}) {
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(defaultOn);
  useEffect(()=>setMounted(true),[]);
  if(!mounted) return null;

  const toggle = () => { const v = !on; setOn(v); onChange?.(v); };
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border transition shadow-sm ${
        on
          ? 'bg-[var(--p)] text-white border-transparent shadow'
          : 'bg-[var(--g50)] text-inherit border-[var(--g300)] opacity-85 hover:shadow dark:bg-[#0F172A] dark:text-[#CBD5E1] dark:border-[var(--g300)]'
      }`}
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? 'bg-white' : 'bg-[var(--g400)]'}`} />
      {on ? 'Research On' : 'Research Off'}
    </button>
  );
}
