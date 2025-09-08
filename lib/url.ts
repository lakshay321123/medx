export function sourceLabelFromUrl(u: string): string {
  try {
    const { hostname } = new URL(u);
    const host = hostname.replace(/^www\./i, "").toLowerCase();

    // Friendly names
    const map: Record<string, string> = {
      "clinicaltrials.gov": "ClinicalTrials.gov",
      "pubmed.ncbi.nlm.nih.gov": "PubMed",
      "ncbi.nlm.nih.gov": "NCBI",
      "nih.gov": "NIH",
      "who.int": "WHO",
      "cdc.gov": "CDC",
      "nhs.uk": "NHS",
      "cancer.gov": "NCI",
      "mayoclinic.org": "Mayo Clinic",
      "uptodate.com": "UpToDate",
      "europepmc.org": "Europe PMC",
      "openalex.org": "OpenAlex",
    };
    if (map[host]) return map[host];
    // Default: Capitalize domain without TLD noise
    const base = host.split(".").slice(-2).join(".");
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Source";
  }
}
