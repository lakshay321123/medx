export function isSavedReportRequest(raw: string): boolean {
  const m = (raw ?? "").toLowerCase();

  // Require first-person ownership + retrieval intent
  const hasFirstPerson =
    /\b(my|my report|my reports|my labs|my test results|my bloodwork|my history)\b/.test(m);

  const hasRetrievalVerb =
    /\b(pull|show|fetch|compare|retrieve|load|bring up|what do my reports say)\b/.test(m);

  // Treat general/newsy mentions as NOT saved-history requests
  const genericCues =
    /\b(latest|recent|global|guidelines|update|news|summary|who|cdc|icmr|nhs|mohfw|covid|influenza|dengue|202[0-9]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/.test(m);

  const hasUrl = /https?:\/\//.test(m);

  // Saved-history intent only if: first-person + retrieval verb AND not generic/news AND no URL
  return hasFirstPerson && hasRetrievalVerb && !genericCues && !hasUrl;
}
