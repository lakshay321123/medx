import { parseStringPromise } from "xml2js";

async function fetchIsrctnXml(isrctn: string, format: "who"|"internal" = "who") {
  const id = isrctn.startsWith("ISRCTN") ? isrctn : `ISRCTN${isrctn}`;
  const url = `https://www.isrctn.com/api/trial/${id}/format/${format}`;
  const res = await fetch(url, { headers: { Accept: "application/xml" }, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`ISRCTN ${res.status}`);
  const xml = await res.text();
  return parseStringPromise(xml, { explicitArray: false });
}

export async function fetchISRCTNRecord(isrctn: string) {
  try {
    const who = await fetchIsrctnXml(isrctn, "who");
    const root = who?.trial || who;
    const id = (root?.trialID || root?.ISRCTN || "").toString().replace(/^ISRCTN?/, "ISRCTN");
    const title = root?.publicTitle || root?.scientificTitle || root?.title || "";
    const phase = root?.phase || root?.studyPhase;
    const status = root?.recruitmentStatus || root?.overallStatus;
    const countries = root?.countries;
    const country = Array.isArray(countries) ? countries[0] : (countries?.country || countries || undefined);
    return { id, title, url: `https://www.isrctn.com/${id}`, phase, status, country, source: "ISRCTN" as const };
  } catch {
    const internal = await fetchIsrctnXml(isrctn, "internal");
    const root = internal?.trial || internal;
    const id = (root?.ISRCTN || "").toString().replace(/^ISRCTN?/, "ISRCTN");
    const title = root?.publicTitle || root?.scientificTitle || root?.title || "";
    const phase = root?.phase || root?.studyPhase;
    const status = root?.recruitmentStatus || root?.overallStatus;
    const country = root?.countries || undefined;
    return { id, title, url: `https://www.isrctn.com/${id}`, phase, status, country, source: "ISRCTN" as const };
  }
}
