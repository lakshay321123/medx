"use client";
import { useEffect, useState } from "react";

export default function Timeline(_props: { threadId?: string }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/timeline", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (!alive) return;
        if (data.error) setError(data.error);
        setItems(data.items || []);
      })
      .catch(err => {
        if (alive) setError(err?.message || String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <div className="p-4 text-red-600 text-sm">{JSON.stringify({ error })}</div>;
  }

  if (!items) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!items.length) {
    return <div className="p-6 text-sm text-muted-foreground">No timeline items yet</div>;
  }

  return (
    <ul className="space-y-2">
      {items.map((it: any) => (
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
              <> — {String(it.value)}{it.unit ? ` ${it.unit}` : ""}</>
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

