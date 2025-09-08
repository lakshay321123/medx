import type { NextApiRequest, NextApiResponse } from "next";

type TrialSummary = {
  id: string;
  title: string;
  status: string;
  phase: string | null;
  conditions: string[];
  outcomes: { measure: string; description: string }[];
  locations: { facility?: string; city?: string; country?: string }[];
  url: string | null;
};

function normalizeCtGov(data: any): TrialSummary {
  const p = data?.protocolSection ?? {};
  const id = p?.identificationModule?.nctId ?? "";
  return {
    id,
    title: p?.identificationModule?.briefTitle ?? "",
    status: p?.statusModule?.overallStatus ?? "",
    phase: (p?.designModule?.phases?.[0] as string) || null,
    conditions: p?.conditionsModule?.conditions ?? [],
    outcomes: (p?.outcomesModule?.primaryOutcomes ?? []).map((o: any) => ({
      measure: o?.measure ?? "",
      description: o?.description ?? "",
    })),
    locations: (p?.contactsLocationsModule?.locations ?? []).map((l: any) => ({
      facility: l?.facility ?? "",
      city: l?.city ?? "",
      country: l?.country ?? "",
    })),
    url: id ? `https://clinicaltrials.gov/study/${id}` : null,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { nctid } = req.query;
    if (!nctid || typeof nctid !== "string" || !/^NCT\d{8}$/i.test(nctid)) {
      return res.status(400).json({ error: "Invalid or missing NCT ID" });
    }

    const url = `https://clinicaltrials.gov/api/v2/studies/${nctid.toUpperCase()}`;
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: `ct.gov error ${r.status}` });
    }

    const data = await r.json();
    const study = Array.isArray(data?.studies) ? data.studies[0] : data;
    if (!study) {
      return res.status(404).json({ error: "Not found" });
    }

    const trial = normalizeCtGov(study);
    return res.status(200).json({ trial });
  } catch (e: any) {
    return res.status(500).json({ error: "Server error", message: e?.message });
  }
}

