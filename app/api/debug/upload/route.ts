import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const keys = Array.from(form.keys());
  const f = form.get("file") as File | null;
  const size = f ? (await f.arrayBuffer()).byteLength : 0;
  return NextResponse.json({
    keys,
    hasFile: !!f,
    fileName: f?.name,
    fileType: f?.type,
    fileSize: size
  });
}
