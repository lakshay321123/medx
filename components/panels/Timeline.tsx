"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Prediction = { id: string; createdAt: string; riskScore: number; band: string };

export default function Timeline(props: { threadId?: string }) {
  const params = useSearchParams();
  const urlThreadId = params.get("threadId") || undefined;
  const threadId = props.threadId || urlThreadId || "";

  const router = useRouter();
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/predictions?threadId=${encodeURIComponent(threadId)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setPreds(data || []);
    } catch (e: any) {
      setError(e.message || "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (threadId) fetchPredictions();
  }, [threadId, fetchPredictions]);

  const onRecompute = useCallback(async () => {
    if (!threadId) return;
    setRecomputing(true);
    setError(null);
    try {
      const r = await fetch("/api/predictions/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      if (!r.ok) throw new Error(await r.text());
      await fetchPredictions();
    } catch (e: any) {
      setError(e.message || "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  }, [threadId, fetchPredictions]);

  const scores = useMemo(() => preds.map((p) => p.riskScore), [preds]);
  const max = Math.max(100, ...scores);
  const points = useMemo(
    () => preds.map((p, i) => `${(i / Math.max(preds.length - 1, 1)) * 100},${100 - (p.riskScore / max) * 100}`).join(" "),
    [preds, max]
  );

  const goChat = (id: string) => {
    const search = new URLSearchParams(window.location.search);
    if (threadId) search.set("threadId", threadId);
    search.set("panel", "chat");
    router.push("?" + search.toString());
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <button
          onClick={onRecompute}
          disabled={recomputing || !threadId}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          aria-busy={recomputing}
        >
          {recomputing ? "Recomputing…" : "Recompute Risk"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : preds.length > 0 ? (
        <>
          <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <ul className="text-sm space-y-1">
            {preds.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <button onClick={() => goChat(p.id)} className="underline">
                  {new Date(p.createdAt).toLocaleDateString()}
                </button>
                <span className="px-2 py-0.5 rounded-full text-xs border">{p.band}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No predictions yet.</p>
      )}
    </div>
  );
}
