"use client";
import useSWR from "swr";
import type { AlertItem } from "@/lib/alerts/types";

export default function AlertsList({ user = "anon" }: { user?: string }) {
  const { data, mutate } = useSWR<AlertItem[]>(
    `/api/alerts?u=${user}`,
    (u) => fetch(u).then((r) => r.json()),
    { refreshInterval: 15000 }
  );

  if (!data?.length) return <p className="text-sm text-neutral-500">No alerts yet.</p>;

  return (
    <ul className="space-y-3">
      {data.map((a: AlertItem) => (
        <li
          key={a.id}
          className={`rounded-lg border p-3 ${
            a.severity === "critical"
              ? "border-red-500/40 bg-red-50 dark:bg-red-950/20"
              : a.severity === "warning"
              ? "border-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">{a.title}</div>
            {!a.read && (
              <button
                onClick={async () => {
                  await fetch("/api/alerts", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user, id: a.id, read: true }),
                  });
                  mutate();
                }}
                className="text-xs underline"
              >
                Mark read
              </button>
            )}
          </div>
          {a.message && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {a.message}
            </p>
          )}
          <div className="mt-1 text-[11px] text-neutral-500">
            {new Date(a.createdAt).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
