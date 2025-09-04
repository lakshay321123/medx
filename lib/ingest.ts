export async function ingestReportText({
  threadId,
  text,
  sourceHash,
  sourceType = "pdf",
  observedAt,
}: {
  threadId?: string | null;
  text: string;
  sourceHash?: string; // e.g., sha256 of file bytes or file.name+size
  sourceType?: string; // pdf|image|fhir|rx|note
  observedAt?: string; // optional ISO if you have it
}) {
  const r = await fetch("/api/ingest/from-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: threadId ?? null,
      text,
      sourceHash,
      defaults: { observed_at: observedAt, meta: { source_type: sourceType } },
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("observations-updated"));
  }
  return r.json();
}
