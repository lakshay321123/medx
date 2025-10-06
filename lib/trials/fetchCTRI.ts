export async function fetchCTRI(title?: string): Promise<any[]> {
  const url = `https://ctri.nic.in/Clinicaltrials/services/Searchdata?trialno=&title=${encodeURIComponent(title || "")}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const text = await res.text();

  try {
    const json = JSON.parse(text);
    return Array.isArray(json) ? json.map(mapCtri) : [];
  } catch {
    return parseCtriXml(text);
  }

  function mapCtri(r: any) {
    return {
      id: r?.ctriNumber || r?.TrialNumber,
      title: r?.PublicTitle || r?.ScientificTitle || r?.title,
      url: r?.url || (r?.ctriNumber ? `https://ctri.nic.in/Clinicaltrials/pview2.php?trialid=${encodeURIComponent(r.ctriNumber)}` : undefined),
      phase: r?.Phase,
      status: r?.RecruitmentStatus,
      country: "India",
      source: "CTRI" as const,
    };
  }

  function parseCtriXml(raw: string) {
    if (typeof DOMParser === "undefined") return [] as any[];
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "application/xml");
    if (doc.querySelector("parsererror")) {
      return [] as any[];
    }

    const trials = Array.from(doc.getElementsByTagName("Trial"));
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
      const id = takeText(node, ["ctriNumber", "TrialNumber"]);
      return {
        id,
        title: takeText(node, ["PublicTitle", "ScientificTitle", "title"]),
        url: id ? `https://ctri.nic.in/Clinicaltrials/pview2.php?trialid=${encodeURIComponent(id)}` : undefined,
        phase: takeText(node, ["Phase"]),
        status: takeText(node, ["RecruitmentStatus"]),
        country: "India",
        source: "CTRI" as const,
      };
    }).filter((r) => r.id || r.title);
  }
}
