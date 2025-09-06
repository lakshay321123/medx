export async function getTrials(params: {
  condition: string; country?: string; city?: string; status?: string; phase?: string; page?: number; pageSize?: number;
}) {
  const qs = new URLSearchParams(params as Record<string,string>);
  const r = await fetch(`/api/trials?${qs.toString()}`, { method: "GET" });
  if (!r.ok) throw new Error("Trials fetch failed");
  return r.json() as Promise<{ rows: any[]; page: number; pageSize: number }>;
}
