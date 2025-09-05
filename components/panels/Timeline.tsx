"use client";

import { useEffect, useState } from "react";

type TimelineItem = {
  id: string;
  kind: "prediction" | "observation";
  name: string;
  value?: string | number | null;
  unit?: string | null;
  probability?: number | null;
  flags?: string[] | null;
  observed_at: string;
};

export default function Timeline(_props: { threadId?: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/timeline", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("observations-updated", handler);
    return () => window.removeEventListener("observations-updated", handler);
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!items?.length) return <p className="text-sm text-muted-foreground">No timeline items yet</p>;

  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={`${it.kind}:${it.id}`} className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">
            {new Date(it.observed_at).toLocaleString()}
          </div>
          <div className="font-medium">
            {it.name}
            {it.kind === "prediction" && typeof it.probability === "number" ? (
              <> — {(it.probability * 100).toFixed(0)}%</>
            ) : null}
            {it.kind === "observation" && it.value != null ? (
              <>
                {" — "}
                {String(it.value)}
                {it.unit ? ` ${it.unit}` : ""}
              </>
            ) : null}
          </div>
          {it.flags?.length ? (
            <div className="text-xs">{it.flags.join(", ")}</div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

