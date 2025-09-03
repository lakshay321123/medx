"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Prediction = { id: string; createdAt: string; riskScore: number; band: string };

export default function Timeline({ threadId = "" }: { threadId?: string }) {
  const router = useRouter();
  const [data, setData] = useState<Prediction[]>([]);

  useEffect(() => {
    if (!threadId) return;
    fetch(`/api/predictions?threadId=${threadId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(setData);
  }, [threadId]);

  const scores = data.map(p => p.riskScore);
  const max = Math.max(100, ...scores);
  const points = data.map((p, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${100 - (p.riskScore / max) * 100}`).join(' ');

  const goChat = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    if (threadId) params.set("threadId", threadId);
    params.set("panel", "chat");
    router.push("?" + params.toString());
    // scroll logic could be added here
  };

  return (
    <div className="p-4 space-y-4">
      {data.length > 0 ? (
        <>
          <svg viewBox="0 0 100 100" className="w-full h-24" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <ul className="text-sm space-y-1">
            {data.map(p => (
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
        <p className="text-sm text-slate-500">No predictions yet.</p>
      )}
    </div>
  );
}
