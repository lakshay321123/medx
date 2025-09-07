export async function whoICTRPFetch(query?: string): Promise<any[]> {
  const url = `https://trialsearch.who.int/api/TrialSearch?title=${encodeURIComponent(query || "")}&results=50`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`WHO ICTRP error ${res.status}`);
  const data = await res.json();

  return (data?.Trials || []).map((t: any) => ({
    id: t.TrialID,
    title: t.ScientificTitle,
    url: t.WebAddress,
    phase: t.Phase,
    status: t.RecruitmentStatus,
    country: t.Country,
    source: "ICTRP"
  }));
}
