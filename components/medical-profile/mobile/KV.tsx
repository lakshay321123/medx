"use client";

import type { ReactNode } from "react";

type KVProps = {
  label: string;
  value: ReactNode;
};

export default function KV({ label, value }: KVProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-[14px] font-semibold leading-6">{value}</span>
    </div>
  );
}
