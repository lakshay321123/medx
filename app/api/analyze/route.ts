import { NextResponse } from "next/server";
import { extractTextFromPDF } from "@/lib/pdftext";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDataUrl(buf: Buffer, mime: string) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function rasterizePdfFirstPage(buf: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    disableWorker: true,
    useSystemFonts: true,
    isEvalSupported: false,
  } as any).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx as any, viewport }).promise;
  return canvas.toDataURL("image/png");
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = (fd.get("file") || fd.get("pdf") || fd.get("image") || fd.get("document")) as File | null;
    if (!file) return NextResponse.json({ error: "file missing" }, { status: 400 });

    const name = (file as any).name || "upload";
    const buf = Buffer.from(await file.arrayBuffer());
    let mime = file.type || "application/octet-stream";
    const lower = name.toLowerCase();

    const isPdf = mime.includes("pdf") || lower.endsWith(".pdf");
    if (isPdf) {
      const { text } = await extractTextFromPDF(buf);
      if (text && text.length > 200) {
        const cResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_TEXT,
            messages: [
              {
                role: "system",
                content:
                  "Classify the following document into one of: blood_report, prescription, discharge_summary, other_textual.",
              },
              { role: "user", content: text },
            ],
          }),
        });
        const cJson = await cResp.json();
        if (!cResp.ok)
          return NextResponse.json({ error: cJson?.error?.message || cResp.statusText }, { status: 502 });
        const rawCat = (cJson.choices?.[0]?.message?.content || "other_textual").trim().toLowerCase();
        const cat = [
          "blood_report",
          "prescription",
          "discharge_summary",
          "other_textual",
        ].includes(rawCat)
          ? (rawCat as any)
          : "other_textual";

        const sysPrompt: Record<string, string> = {
          blood_report:
            "You are a medical assistant. Summarize the lab report: highlight abnormal values, explain significance, next steps.",
          prescription:
            "You are a pharmacist. List the medications, dosage, frequency, cautions, and patient-friendly explanations.",
          discharge_summary:
            "You are a clinician. Summarize diagnosis, treatment given, and follow-up advice in clear language.",
          other_textual:
            "You are a medical explainer. Provide a concise summary in simple, non-alarming language.",
        };

        const aResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_TEXT,
            messages: [
              { role: "system", content: sysPrompt[cat] },
              { role: "user", content: text },
            ],
          }),
        });
        const aJson = await aResp.json();
        if (!aResp.ok)
          return NextResponse.json({ error: aJson?.error?.message || aResp.statusText }, { status: 502 });
        const report = aJson.choices?.[0]?.message?.content || "";

        const category = cat === "other_textual" ? "other" : cat;
        return NextResponse.json({
          type: "auto",
          filename: name,
          category,
          report,
          disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
        });
      }

      // little or no text -> treat as image
      const dataUrl = await rasterizePdfFirstPage(buf);
      const vResp = await fetch("https://api.openai.com/v1/chat/completions", {
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
      const vJson = await vResp.json();
      if (!vResp.ok)
        return NextResponse.json({ error: vJson?.error?.message || vResp.statusText }, { status: 502 });
      const report = vJson.choices?.[0]?.message?.content || "";
      return NextResponse.json({
        type: "auto",
        filename: name,
        category: "xray",
        report,
        disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
      });
    }

    const looksLikeImage =
      mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(lower);
    if (!looksLikeImage) {
      return NextResponse.json(
        { error: `Unsupported MIME type: ${mime} (name: ${name}). Upload a PDF or image.` },
        { status: 415 }
      );
    }

    if (!mime || mime === "application/octet-stream") {
      const ext = lower.split(".").pop() || "";
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
    if (!resp.ok)
      return NextResponse.json({ error: j?.error?.message || resp.statusText }, { status: 502 });
    const report = j.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      type: "auto",
      filename: name,
      category: "xray",
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze failed" }, { status: 500 });
  }
}

