"use client";

import { useT } from "@/components/hooks/useI18n";
import React from "react";

export function ConstraintChips({ include = [], exclude = [], onRemove }: {
  include?: string[];
  exclude?: string[];
  onRemove?: (type: "include" | "exclude", value: string) => void;
}) {
  const t = useT();
  if (!include.length && !exclude.length) return null;
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {include.map((v) => (
        <button
          key={`inc-${v}`}
          onClick={() => onRemove?.("include", v)}
          className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
          title={t("Remove")}
        >
          + {v}
        </button>
      ))}
      {exclude.map((v) => (
        <button
          key={`exc-${v}`}
          onClick={() => onRemove?.("exclude", v)}
          className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200"
          title={t("Remove")}
        >
          − {v}
        </button>
      ))}
    </div>
  );
}
