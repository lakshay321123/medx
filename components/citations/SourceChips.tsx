import React from "react";
import type { Cite } from "@/lib/normalizeCitations";

export type { Cite } from "@/lib/normalizeCitations";

const short = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const labelFor = (c: Cite) => {
  if (c.title?.trim()) return short(c.title.trim());
  try {
    return new URL(c.url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
};

export function SourceChips({ items }: { items?: Cite[] }) {
  if (!items?.length) return null;
  return (
    <div className="so-source-chips">
      {items.map((c, i) => (
        <a
          key={i}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className="so-chip"
          aria-label={`Open source: ${labelFor(c)}`}
        >
          <span className="so-dot" />
          {labelFor(c)}
        </a>
      ))}
    </div>
  );
}
