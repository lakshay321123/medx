export async function fetchEUCTR(query?: string): Promise<any[]> {
  const url = `https://www.clinicaltrialsregister.eu/ctr-search/rest/search?query=${encodeURIComponent(query||"")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`EUCTR ${res.status}`);
  const data = await res.json(); // EUCTR returns JSON array of entries
  // Map to a common shape (best-effort)
  return (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r?.eudractNumber || r?.trialNumber || r?.id,
    title: r?.scientificTitle || r?.fullTitle || r?.title,
    url: r?.trialUrl || (r?.eudractNumber ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${r.eudractNumber}` : undefined),
    phase: r?.trialPhase || r?.phase,            // raw string (normalize later)
    status: r?.trialStatus || r?.status,         // raw string (normalize later)
    country: (r?.memberStatesConcerned || r?.countries || [])[0],
    source: "EUCTR" as const
  })).filter(x => x.id && x.title);
}
