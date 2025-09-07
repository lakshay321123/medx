import { parseStringPromise } from "xml2js";

export async function fetchEUCTR(query?: string): Promise<any[]> {
  const url = `https://www.clinicaltrialsregister.eu/ctr-search/rest/search?query=${encodeURIComponent(query||"")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.map(mapEuctrJson) : [];
  } catch {
    const xml = await parseStringPromise(text, { explicitArray: false });
    const list = Array.isArray(xml?.result?.trial) ? xml.result.trial : (xml?.result?.trial ? [xml.result.trial] : []);
    return list.map(mapEuctrXml);
  }

  function mapEuctrJson(r:any) {
    return {
      id: r?.eudractNumber || r?.trialNumber || r?.id,
      title: r?.scientificTitle || r?.fullTitle || r?.title,
      url: r?.trialUrl || (r?.eudractNumber ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${r.eudractNumber}` : undefined),
      phase: r?.trialPhase || r?.phase,
      status: r?.trialStatus || r?.status,
      country: (r?.memberStatesConcerned || r?.countries || [])[0],
      source: "EUCTR" as const
    };
  }

  function mapEuctrXml(r:any) {
    return {
      id: r?.eudractNumber || r?.trialNumber || r?.id || r?.EudraCTNumber,
      title: r?.scientificTitle || r?.fullTitle || r?.title || r?.ScientificTitle,
      url: r?.trialUrl || (r?.eudractNumber || r?.EudraCTNumber ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${r.eudractNumber || r.EudraCTNumber}` : undefined),
      phase: r?.trialPhase || r?.phase || r?.TrialPhase,
      status: r?.trialStatus || r?.status || r?.TrialStatus,
      country: (r?.memberStatesConcerned || r?.countries || [])[0] || r?.Country,
      source: "EUCTR" as const
    };
  }
}
