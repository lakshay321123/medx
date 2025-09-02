import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5"; // images

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buf: Buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function looksLikePdfByMagic(buf: Buffer): boolean {
  // %PDF-  => 0x25 0x50 0x44 0x46 0x2D
  return (
    buf.length >= 5 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  );
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    // Accept both legacy and unified field names
    const multi = fd.getAll("files[]").filter(Boolean) as File[];
    const single = (fd.get("file") || fd.get("image") || fd.get("pdf") || fd.get("document")) as File | null;
    const file = multi[0] ?? single;
    if (!file) {
      return NextResponse.json(
        { error: "No file found. Send as 'file' (preferred) or 'files[]'." },
        { status: 400 }
      );
    }

    const name = (file as any).name || "upload";
    let mime = file.type || "application/octet-stream";
    const lowerName = name.toLowerCase();

    // Read once so we can check the PDF signature reliably
    const buf = Buffer.from(await file.arrayBuffer());

    const isPdf =
      mime.includes("pdf") ||
      lowerName.endsWith(".pdf") ||
      looksLikePdfByMagic(buf);
    if (isPdf) {
      return NextResponse.json(
        { error: "This endpoint only supports images. Send PDFs to /api/analyze." },
        { status: 400 }
      );
    }

    // --- EXISTING IMAGE / X-RAY FLOW (leave this as-is) ---
    const looksLikeImage =
      mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(lowerName);
    if (!looksLikeImage) {
      // Optional: log unsupported to debug
      console.warn("[/api/imaging/analyze] unsupported MIME", { name, mime, size: buf.length });
      return NextResponse.json(
        { error: `Unsupported MIME type for imaging: ${mime} (name: ${name})` },
        { status: 415 }
      );
    }

    // Normalize mime if needed
    if (!mime || mime === "application/octet-stream") {
      const ext = lowerName.split(".").pop() || "";
      mime = ext ? `image/${ext === "jpg" ? "jpeg" : ext}` : "image/jpeg";
    }

    const dataUrl = toDataUrl(buf, mime);

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

    const res = NextResponse.json({
      type: "image",
      filename: name,
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
    res.headers.set("x-branch", "image");
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "imaging analyze failed" }, { status: 500 });
  }
}
