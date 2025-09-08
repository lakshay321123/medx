export function recallDomainTags(text: string): string[] | null {
  const s = text.toLowerCase();
  if (/pull up the rehab plan|rehab plan|rehab protocol/.test(s)) {
    return ["physiotherapy", "wellness"];
  }
  if (/show the sleep protocol|sleep protocol|sleep plan/.test(s)) {
    return ["sleep", "wellness"];
  }
  return null;
}
