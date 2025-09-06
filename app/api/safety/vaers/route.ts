import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableVAERS) return NextResponse.json({ disabled: true });
  const params = new URL(req.url).searchParams;
  const year = params.get("year") || new Date().getFullYear().toString();
  const limit = params.get("limit") || "5";

  const url = new URL(`https://data.cdc.gov/resource/vaers_${year}.json`);
  url.searchParams.set("$limit", limit);
  url.searchParams.set(
    "$select",
    "vaers_id,age_yrs,sex,vax_name,onset_interval,died,l_threat,er_ed_visit,hosp,disabled"
  );

  const headers: Record<string, string> = {};
  const token = process.env.SOCRATA_APP_TOKEN;
  if (token) headers["X-App-Token"] = token;

  const r = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  const reports = (j || []).map((x: any) => ({
    vaers_id: x.vaers_id,
    age_yrs: x.age_yrs ? Number(x.age_yrs) : undefined,
    sex: x.sex,
    vax_name: x.vax_name,
    onset_interval: x.onset_interval ? Number(x.onset_interval) : undefined,
    serious:
      x.died === "Y" ||
      x.l_threat === "Y" ||
      x.er_ed_visit === "Y" ||
      x.hosp === "Y" ||
      x.disabled === "Y",
  }));

  return NextResponse.json({ reports });
}
