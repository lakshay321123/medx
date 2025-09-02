import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File;
    const instruction = (fd.get("instruction") as string) || "";
    const audience = ((fd.get("audience") as string) || "patient") as "patient" | "clinician";
    if (!file) return NextResponse.json({ error: "file missing" }, { status: 400 });

    const name = (file.name || "").toLowerCase();
    const mime = file.type || "";
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    const isImage =
      mime.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp)$/i.test(name);
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: "Please upload a PDF or image." }, { status: 400 });
    }

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

    let userContent: any[] = [];
    let model = MODEL_TEXT;

    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(Buffer.from(arrayBuffer));
      const text = data.text || "";
      userContent = [{ type: "text", text }];
    } else {
      model = MODEL_VISION;
      const arrayBuffer = await file.arrayBuffer();
      const mimeType = mime || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      userContent = [
        { type: "text", text: "Analyze this image and provide a report." },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => null);
      return NextResponse.json(
        { error: errData?.error?.message || `OpenAI error ${r.status}` },
        { status: r.status }
      );
    }

    const data = await r.json();
    const report = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: isPdf ? "pdf" : "image",
      filename: file.name || "upload",
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze failed" }, { status: 500 });
  }
}

