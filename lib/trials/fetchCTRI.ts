import { parseStringPromise } from "xml2js";

export async function fetchCTRI(title?: string): Promise<any[]> {
  const url = `http://ctri.nic.in/Clinicaltrials/services/Searchdata?trialno=&title=${encodeURIComponent(title||"")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    return Array.isArray(json) ? json.map(mapCtri) : [];
  } catch {
    const xml = await parseStringPromise(text, { explicitArray: false });
    const list = Array.isArray(xml?.Trials?.Trial) ? xml.Trials.Trial : (xml?.Trials?.Trial ? [xml.Trials.Trial] : []);
    return list.map(mapCtriXml);
  }

  function mapCtri(r:any) {
    return {
      id: r?.trialNumber || r?.ctriNumber,
      title: r?.publicTitle || r?.scientificTitle,
      url: r?.url || (r?.ctriNumber ? `http://ctri.nic.in/Clinicaltrials/pmaindet2.php?trialid=${encodeURIComponent(r.ctriNumber)}` : undefined),
      phase: r?.phase?.toString(),
      status: r?.recruitmentStatus,
      country: "India",
      source: "CTRI" as const
    };
  }
  function mapCtriXml(r:any) {
    return {
      id: r?.TrialNumber || r?.ctriNumber,
      title: r?.PublicTitle || r?.ScientificTitle,
      url: r?.url || (r?.ctriNumber ? `http://ctri.nic.in/Clinicaltrials/pmaindet2.php?trialid=${encodeURIComponent(r.ctriNumber)}` : undefined),
      phase: r?.Phase,
      status: r?.RecruitmentStatus,
      country: "India",
      source: "CTRI" as const
    };
  }
}
