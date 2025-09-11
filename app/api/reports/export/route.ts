import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const RANGE_MAP: Record<string, { low: number; high: number }> = {
  ALT: { low: 0, high: 40 },
  AST: { low: 0, high: 40 },
};

const cache: Record<string, { expires: number; payload: any }> = {};

export async function POST(req: NextRequest) {
  if ((process.env.REPORT_STRUCTURED_EXPORT || "false").toLowerCase() !== "true") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { panels, patient } = body || {};
  if (!Array.isArray(panels) || panels.length === 0) {
    return NextResponse.json({ error: "panels required" }, { status: 400 });
  }
  for (const p of panels) {
    if (!Array.isArray(p.tests) || p.tests.length === 0) {
      return NextResponse.json({ error: "tests required" }, { status: 400 });
    }
    for (const t of p.tests) {
      if (typeof t.value !== "number") {
        return NextResponse.json({ error: "numeric value required" }, { status: 400 });
      }
    }
  }

  const hash = crypto.createHash("md5").update(JSON.stringify(body)).digest("hex");
  const ttl = Number(process.env.REPORT_EXPORT_TTL_SEC || "900") * 1000;
  const now = Date.now();
  if (cache[hash] && cache[hash].expires > now) {
    const cached = cache[hash].payload;
    return NextResponse.json({ ...cached, meta: { ...cached.meta, cached: true } });
  }

  const rows: any[] = [];
  let withRange = 0;
  for (const p of panels) {
    for (const t of p.tests) {
      const name = String(t.name || "").toUpperCase();
      const unit = t.unit || "unknown";
      const range = RANGE_MAP[name];
      let ref_low: number | null = null;
      let ref_high: number | null = null;
      let flag = "N";
      if (range) {
        ref_low = range.low;
        ref_high = range.high;
        if (t.value < range.low) flag = "L";
        else if (t.value > range.high) flag = "H";
        withRange++;
      }
      rows.push({ panel: p.panel, test: name, value: t.value, unit, ref_low, ref_high, flag });
    }
  }
  const coverage_pct = rows.length ? Math.round((withRange / rows.length) * 100) : 0;
  const csvHeader = "panel,test,value,unit,ref_low,ref_high,flag\n";
  const csvRows = rows.map(r => `${r.panel},${r.test},${r.value},${r.unit},${r.ref_low ?? ''},${r.ref_high ?? ''},${r.flag}`).join("\n");
  const csv = csvHeader + csvRows + "\n";
  const fileId = `${hash}.csv`;
  const filePath = path.join("/tmp", fileId);
  await fs.writeFile(filePath, csv, "utf8");

  const payload = {
    json: { rows, coverage_pct },
    csv_url: `/api/reports/export/file/${fileId}`,
    meta: { cached: false, ttl_sec: Number(process.env.REPORT_EXPORT_TTL_SEC || "900") },
  };
  cache[hash] = { expires: now + ttl, payload };

  console.log({ rows: rows.length, coverage_pct });
  return NextResponse.json(payload);
}
