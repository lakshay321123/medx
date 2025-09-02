import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT   = process.env.OPENAI_TEXT_MODEL   || "gpt-5"; // PDFs
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5"; // X-rays/images

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    // unified single field (tolerate legacy names too)
    const file = (fd.get("file") || fd.get("pdf") || fd.get("image") || fd.get("document")) as File | null;
    if (!file) return NextResponse.json({ error: "file missing" }, { status: 400 });

    const doctorMode = (fd.get("doctorMode") || "true").toString() === "true";
    const name = (file as any).name || "upload";
    const buf  = Buffer.from(await file.arrayBuffer());
    let mime   = file.type || "application/octet-stream";
    const lowerName = name.toLowerCase();

    // ---------- PDF BRANCH (handle first, then return) ----------
    const looksLikePdf = mime.includes("pdf") || lowerName.endsWith(".pdf");
    if (looksLikePdf) {
      const dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;

      // Patient summary (OpenAI only; no temperature)
      const pResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_TEXT,
          messages: [
            { role: "system", content: "You are a medical explainer. Summarize reports for patients in clear, calm, non-alarming language (8th–10th grade)." },
            { role: "user", content: [
              { type: "text", text: "Please summarize this medical report for a patient." },
              { type: "image_url", image_url: { url: dataUrl } }
            ] }
          ],
        }),
      });
      const pJson = await pResp.json();
      if (!pResp.ok) {
        return NextResponse.json({ error: pJson?.error?.message || pResp.statusText }, { status: 502 });
      }
      const patient = pJson.choices?.[0]?.message?.content || "";

      // Doctor summary (optional)
      let doctor: string | null = null;
      if (doctorMode) {
        const dResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_TEXT,
            messages: [
              { role: "system", content: "You are a clinician. Write a structured summary with headings: HPI/Context, Key Results, Interpretation, Plan, Red Flags, Limitations. Be concise and evidence-based." },
              { role: "user", content: [
                { type: "text", text: "Summarize this report for a doctor." },
                { type: "image_url", image_url: { url: dataUrl } }
              ] }
            ],
          }),
        });
        const dJson = await dResp.json();
        if (!dResp.ok) {
          return NextResponse.json({ error: dJson?.error?.message || dResp.statusText }, { status: 502 });
        }
        doctor = dJson.choices?.[0]?.message?.content || "";
      }

      return NextResponse.json({
        type: "pdf",
        filename: name,
        patient,
        doctor: doctorMode ? doctor : null,
        disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
      });
    }
    // ---------- END PDF BRANCH ----------

    // ---------- IMAGE / X-RAY BRANCH (leave behavior as-is) ----------
    const looksLikeImage =
      mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(lowerName);

    if (!looksLikeImage) {
      return NextResponse.json(
        { error: `Unsupported MIME type: ${mime} (name: ${name}). Upload a PDF or image.` },
        { status: 415 }
      );
    }

    // Normalize mime for octet-stream images by extension
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
          { role: "system", content: "You are a radiologist. Write a structured X-ray report: Technique, Findings, Impression (≤3 bullets, cautious language), Recommendations, Limitations." },
          { role: "user", content: [
            { type: "text", text: "Analyze this X-ray and generate a radiology-style report." },
            { type: "image_url", image_url: { url: dataUrl } }
          ] }
        ],
      }),
    });

    const j = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: j?.error?.message || resp.statusText }, { status: 502 });

    const report = j.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: "image",
      filename: name,
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze failed" }, { status: 500 });
  }
}

