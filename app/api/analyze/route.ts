import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = (file.name || "").toLowerCase();
  const mime = file.type || "";
  if (!(mime === "application/pdf" || name.endsWith(".pdf"))) {
    return NextResponse.json({ error: "Only PDFs are accepted here." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { text: textRaw } = await extractTextFromPDF(buf);
  const text = (textRaw || "").slice(0, 20000);

  const systemPrompt = "Summarize this medical report clearly. Add a disclaimer.";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]
    })
  });

  const data = await r.json();
  if (!r.ok) {
    return NextResponse.json({ error: data?.error?.message || "OpenAI error" }, { status: r.status });
  }

  return NextResponse.json({
    type: "pdf",
    filename: file.name,
    report: data?.choices?.[0]?.message?.content || "",
    disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician."
  });
}

