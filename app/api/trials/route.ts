import { NextResponse } from "next/server";
import { normalizeTrial } from "@/lib/research/orchestrator";

// In real usage, call your search backend / third-party here
async function fetchTrialsMock(q: { condition: string; keywords?: string }) {
  const seed = [
    { id: "NCT-001", title: `${q.condition} EGFR Inhibitor Study`, phase: "Phase III", status: "Recruiting", country: "India", gene: "EGFR", url: "https://clinicaltrials.gov/ct2/show/NCT00000001" },
    { id: "NCT-002", title: `${q.condition} ALK Fusion Trial`,        phase: "Phase II",  status: "Completed",  country: "USA",   gene: "ALK",  url: "https://clinicaltrials.gov/ct2/show/NCT00000002" },
    { id: "NCT-003", title: `${q.condition} KRAS G12C Combo`,         phase: "Phase III", status: "Recruiting", country: "EU",    gene: "KRAS", url: "https://clinicaltrials.gov/ct2/show/NCT00000003" },
  ];
  return seed.map(normalizeTrial);
}

export async function POST(req: Request) {
  const body = await req.json();
  const trials = await fetchTrialsMock({ condition: body.condition, keywords: body.keywords });
  return NextResponse.json({ ok: true, trials });
}
