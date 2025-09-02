import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_VISION_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    // Tolerate both the old and new field names
    const multi = fd.getAll("files[]").filter(Boolean) as File[];
    const single = (fd.get("file") || fd.get("image")) as File | null;
    const file = multi[0] ?? single;
    if (!file) {
      return NextResponse.json(
        { error: "No image found. Send as 'file' (preferred) or 'files[]'." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const dataUrl = toDataUrl(buf, mime);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a radiologist. Write a structured X-ray report: Technique, Findings, Impression (≤3 bullets, cautious language), Recommendations, Limitations.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this X-ray and generate a radiology-style report." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    const j = await resp.json();
    if (!resp.ok) throw new Error(j?.error?.message || resp.statusText);

    const report = j.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "imaging analyze failed" }, { status: 500 });
  }
}
