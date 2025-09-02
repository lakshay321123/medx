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
    if (!file) {
      return NextResponse.json({ error: "file missing" }, { status: 400 });
    }

    const instruction = (fd.get("instruction") || "").toString();
    const audience = (fd.get("audience") || "patient").toString();

    const name = (file as any).name || "upload";
    const mime = file.type || "";
    const lower = name.toLowerCase();
    const isPdf = mime === "application/pdf" || lower.endsWith(".pdf");
    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp)$/i.test(lower);

    if (!isPdf) {
      if (isImage) {
        return NextResponse.json(
          { error: "Images are handled by /api/imaging/analyze." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Unsupported file type: ${mime || name}` },
        { status: 415 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const { text } = await extractTextFromPDF(buf);
    const trimmed = text.slice(0, 20_000);

    const baseStyle =
      audience === "clinician"
        ? "Write like a clinician for colleagues: findings, differentials, red flags, recommended next steps."
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

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_TEXT,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Here is PDF text content:\n\n${trimmed}`,
          },
        ],
      }),
    });
    const j = await resp.json();
    if (!resp.ok) {
      return NextResponse.json(
        { error: j?.error?.message || resp.statusText },
        { status: resp.status }
      );
    }

    const report = j.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: "pdf",
      filename: name,
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

