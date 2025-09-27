"use client";

import type { ReactNode } from "react";

type EmptyProps = {
  children: ReactNode;
};

export default function Empty({ children }: EmptyProps) {
  return <p className="text-[13px] text-slate-500 dark:text-slate-400">{children}</p>;
}
