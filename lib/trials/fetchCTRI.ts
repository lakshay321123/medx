export async function fetchCTRI(title?: string): Promise<any[]> {
  const url = `http://ctri.nic.in/Clinicaltrials/services/Searchdata?trialno=&title=${encodeURIComponent(title||"")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CTRI ${res.status}`);
  const data = await res.json(); // returns array
  return (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r?.trialNumber || r?.ctriNumber || r?.TrialNumber,
    title: r?.publicTitle || r?.scientificTitle || r?.studyTitle,
    url: r?.url || (r?.ctriNumber ? `http://ctri.nic.in/Clinicaltrials/pmaindet2.php?trialid=${encodeURIComponent(r.ctriNumber)}` : undefined),
    phase: r?.phase?.toString(),        // normalize later
    status: r?.recruitmentStatus,       // normalize later
    country: "India",
    source: "CTRI" as const
  })).filter(x => x.id && x.title);
}
