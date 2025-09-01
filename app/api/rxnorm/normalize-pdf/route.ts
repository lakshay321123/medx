import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "No file provided (expecting 'file' in form-data)" },
      { status: 400 }
    );
  }

  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const isPdf =
    type.includes("pdf") ||
    type === "application/octet-stream" ||
    name.endsWith(".pdf");

  if (!isPdf) {
    return NextResponse.json(
      { ok: false, error: `Expected PDF, got ${type || "unknown"}` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    const res = await extractTextFromPDF(buf); // includes OCR fallback
    text = res.text || "";
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "PDF parse failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "Empty PDF or OCR failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, text });
}
