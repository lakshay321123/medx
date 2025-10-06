export async function fetchEUCTR(query?: string): Promise<any[]> {
  const url = `https://www.clinicaltrialsregister.eu/ctr-search/rest/search?query=${encodeURIComponent(query||"")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data.map(mapEuctrJson) : [];
  } catch {
    return parseEuctrXml(text);
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

  function parseEuctrXml(raw: string) {
    if (typeof DOMParser === "undefined") return [] as any[];
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "application/xml");
    if (doc.querySelector("parsererror")) {
      return [] as any[];
    }

    const trials = Array.from(doc.getElementsByTagName("trial"));
    if (!trials.length) return [] as any[];

    const takeText = (node: Element, names: string[]): string | undefined => {
      for (const name of names) {
        const found = node.getElementsByTagName(name)[0];
        const value = found?.textContent?.trim();
        if (value) return value;
      }
      return undefined;
    };

    return trials.map((node) => {
      const countries = Array.from(node.getElementsByTagName("country"))
        .map((n) => n.textContent?.trim())
        .filter(Boolean);
      const id = takeText(node, ["eudractNumber", "trialNumber", "id", "EudraCTNumber"]);
      const urlId = takeText(node, ["eudractNumber", "EudraCTNumber", "trialNumber", "id"]);
      return {
        id,
        title: takeText(node, ["scientificTitle", "fullTitle", "title", "ScientificTitle"]),
        url: urlId ? `https://www.clinicaltrialsregister.eu/ctr-search/trial/${urlId}` : undefined,
        phase: takeText(node, ["trialPhase", "phase", "TrialPhase"]),
        status: takeText(node, ["trialStatus", "status", "TrialStatus"]),
        country: countries[0],
        source: "EUCTR" as const,
      };
    }).filter((r) => r.id || r.title);
  }
}
