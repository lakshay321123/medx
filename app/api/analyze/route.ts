import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const instruction = (fd.get("instruction") as string) || "";
    const audience = ((fd.get("audience") as string) || "patient") as
      | "patient"
      | "clinician";

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const name = (file.name || "").toLowerCase();
    const mime = file.type || "";
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type for /api/analyze. Upload a PDF. (Images go to /api/imaging/analyze.)",
        },
        { status: 400 }
      );
    }

    // Read PDF
    const arr = new Uint8Array(await file.arrayBuffer());
    const buf = Buffer.from(arr);

    // Extract text
    const { text: textRaw } = await extractTextFromPDF(buf);
    const text = (textRaw || "").slice(0, 20000) ||
      "(No extractable text found in PDF)";

    // Style prompt
    const baseStyle =
      audience === "clinician"
        ? "Write like a clinician for colleagues: findings, differentials, red flags, and recommended next steps."
        : "Explain in simple language: plain English, short sentences, key points and next steps.";
    const custom = instruction ? `User instruction: ${instruction}` : "";
    const systemPrompt = [
      "You are a careful medical assistant. Never provide a diagnosis; provide support and clarity.",
      baseStyle,
      custom,
      "Always include a brief disclaimer that this is not a medical diagnosis.",
    ]
      .filter(Boolean)
      .join("\n\n");

    // OpenAI (GPT-5) — no temperature param
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_TEXT,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is PDF text content:\n\n${text}` },
        ],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `OpenAI error ${r.status}` },
        { status: r.status }
      );
    }

    const report = data?.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: "pdf",
      filename: file.name || "document.pdf",
      report,
      disclaimer:
        "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "analyze failed" },
      { status: 500 }
    );
  }
}

