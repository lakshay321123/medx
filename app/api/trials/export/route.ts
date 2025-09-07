import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const { rows } = await req.json();
  const header = ["id","title","status","phase","country","source","url"];
  const lines = [header.join(",")].concat(
    rows.map((r:any)=>header.map(h=>JSON.stringify((r[h]??"").toString())).join(","))
  );
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=trials.csv"
    }
  });
}
