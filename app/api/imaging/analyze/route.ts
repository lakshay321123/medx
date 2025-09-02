import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5"; // images

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const f = fd.get("file") as File;
    if (!f) throw new Error("No file uploaded");

    const name = (f.name || "").toLowerCase();
    const mime = f.type || "";

    // Reject PDFs explicitly
    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "This endpoint only supports images. Send PDFs to /api/analyze." },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await f.arrayBuffer());

    const looksLikeImage =
      mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(name);
    if (!looksLikeImage) {
      return NextResponse.json(
        { error: `Unsupported MIME type for imaging: ${mime} (name: ${name})` },
        { status: 415 }
      );
    }

    const finalMime =
      mime && mime !== "application/octet-stream"
        ? mime
        : (() => {
            const ext = name.split(".").pop() || "";
            return ext ? `image/${ext === "jpg" ? "jpeg" : ext}` : "image/jpeg";
          })();

    const dataUrl = toDataUrl(buf, finalMime);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_VISION,
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
      }),
    });

    const j = await resp.json();
    if (!resp.ok) throw new Error(j?.error?.message || resp.statusText);

    const report = j.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: "image",
      filename: name,
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "imaging analyze failed" }, { status: 500 });
  }
}

