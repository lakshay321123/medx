import type { NextApiRequest, NextApiResponse } from "next";

// Small helper to keep JSON shape stable for UI
function normalizeCtGov(study: any) {
  const p = study?.protocolSection ?? {};
  const id = p?.identificationModule?.nctId ?? "";
  const title = p?.identificationModule?.briefTitle ?? "";
  const status = p?.statusModule?.overallStatus ?? "";
  const phases = p?.designModule?.phases ?? [];
  const conditions = p?.conditionsModule?.conditions ?? [];
  const outcomes = (p?.outcomesModule?.primaryOutcomes ?? []).map((o: any) => ({
    measure: o?.measure ?? "",
    description: o?.description ?? ""
  }));
  const locations =
    p?.contactsLocationsModule?.locations?.map((l: any) => ({
      facility: l?.facility,
      city: l?.city,
      country: l?.country
    })) ?? [];
  return {
    id, title, status,
    phase: phases?.[0] ?? null,
    conditions, outcomes, locations,
    url: id ? `https://clinicaltrials.gov/study/${id}` : null
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { nctid } = req.query;
    if (!nctid || typeof nctid !== "string" || !/^NCT\d{8}$/i.test(nctid))
      return res.status(400).json({ error: "Missing or invalid NCT ID" });

    const url = `https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(nctid.toUpperCase())}`;
    const r = await fetch(url, { next: { revalidate: 3600 } }); // passive cache OK on Vercel
    if (!r.ok) return res.status(r.status).json({ error: `ct.gov ${r.status}` });

    const data = await r.json();
    const study = Array.isArray(data?.studies) ? data.studies[0] : data;
    if (!study) return res.status(404).json({ error: "Not found" });

    return res.status(200).json({ trial: normalizeCtGov(study), raw: undefined }); // no raw by default
  } catch (e: any) {
    console.error("Trial detail error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
