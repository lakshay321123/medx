// Example: ICD code "250.00" diabetes (ICD-9 sample); update mapping as needed.
export async function medlinePlusByICD(code: string, displayName?: string) {
  const url = new URL("https://connect.medlineplus.gov/service");
  url.searchParams.set("mainSearchCriteria.v.cs", "2.16.840.1.113883.6.103"); // ICD-9
  url.searchParams.set("mainSearchCriteria.v.c", code);
  if (displayName) url.searchParams.set("mainSearchCriteria.v.dn", displayName);
  url.searchParams.set("informationRecipient.languageCode.c", "en");
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) return null;
  const xml = await r.text(); // returns XML; parse client-side if needed
  return xml;
}
