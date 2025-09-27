export type ManualOb = { text: string; observedAt: string | null; raw?: any };

export async function extractManualObservation(manualKind: string): Promise<ManualOb> {
  const res = await fetch(
    `/api/observations/latest?manualKind=${encodeURIComponent(manualKind)}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return { text: "", observedAt: null };
  }

  const ob = await res.json().catch(() => null);
  if (!ob) {
    return { text: "", observedAt: null };
  }

  const meta = (ob as any)?.meta ?? {};
  const text = meta?.summary || meta?.text || ob?.value_text || "";
  const observedAt = typeof ob?.observed_at === "string" ? ob.observed_at : null;

  return { text, observedAt, raw: ob };
}
