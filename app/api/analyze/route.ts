import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function extractTextFromPDF(buffer: Buffer) {
  try {
    const pdf = (await import("pdf-parse")).default;
    const data = await pdf(buffer);
    return data.text || "";
  } catch {
    return "";
  }
}

async function rasterizeFirstPage(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  (pdfjs as any).GlobalWorkerOptions.workerSrc = false;
  const { createCanvas } = await import("@napi-rs/canvas");
  const doc = await pdfjs
    .getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
      isEvalSupported: false,
    } as any)
    .promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context as any, viewport }).promise;
  return canvas.toDataURL("image/png");
}

async function classifyText(text: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_TEXT,
      messages: [
        {
          role: "system",
          content:
            "Classify into: blood_report, prescription, discharge_summary, other_medical_doc.",
        },
        { role: "user", content: text.slice(0, 2000) },
      ],
    }),
  });
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim() || "other_medical_doc";
}

async function classifyImage(dataUrl: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_VISION,
      messages: [
        {
          role: "system",
          content:
            "Classify this medical image into: xray, lab_report, prescription, discharge_summary, other_medical_doc.",
        },
        { role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }] },
      ],
    }),
  });
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim() || "other_medical_doc";
}

function promptForCategory(category: string, doctorMode: boolean): string {
  switch (category) {
    case "xray":
      return doctorMode
        ? "You are a radiologist. Write a detailed structured X-ray report with Technique, Findings, Impression, differentials, and recommendations for clinicians."
        : "Explain this X-ray in plain language for a patient. Summarize findings, meaning, and next steps simply.";
    case "lab_report":
      return doctorMode
        ? "You are a clinician. Analyze this lab report. Include flagged values, differentials, clinical significance, recommendations."
        : "Summarize this lab report in plain language. Highlight abnormal values and what they might mean.";
    case "prescription":
      return doctorMode
        ? "You are a clinician reviewing a prescription. List medicines, dosage, frequency, rationale, contraindications."
        : "Summarize this prescription in simple terms. List medicines, when to take them, and precautions.";
    case "discharge_summary":
      return doctorMode
        ? "Summarize diagnosis, procedures, treatment given, and follow-up plan in medical detail."
        : "Summarize this discharge summary in plain language. Focus on diagnosis, treatment, and what to do next.";
    default:
      return doctorMode
        ? "Provide a clinical-style summary of this medical document for healthcare professionals."
        : "Provide a patient-friendly summary of this medical document in simple, non-technical language.";
  }
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const doctorMode = fd.get("doctorMode") === "true";

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const name = file.name || "document";
    const mime = file.type || "";
    const buf = Buffer.from(new Uint8Array(await file.arrayBuffer()));

    let category = "other_medical_doc";
    let report = "";
    let dataUrl: string | null = null;

    if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      const text = await extractTextFromPDF(buf);
      if (text.length > 100) {
        category = await classifyText(text);
        const systemPrompt = promptForCategory(category, doctorMode);
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
              { role: "user", content: text.slice(0, 15000) },
            ],
          }),
        });
        const data = await r.json();
        report = data?.choices?.[0]?.message?.content || "";
      } else {
        dataUrl = await rasterizeFirstPage(buf);
        category = await classifyImage(dataUrl);
      }
    } else if (mime.startsWith("image/")) {
      dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      category = await classifyImage(dataUrl);
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (dataUrl && !report) {
      const systemPrompt = promptForCategory(category, doctorMode);
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_VISION,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }] },
          ],
        }),
      });
      const data = await r.json();
      report = data?.choices?.[0]?.message?.content || "";
    }

    return NextResponse.json({
      type: "auto",
      filename: name,
      category,
      report,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze failed" }, { status: 500 });
  }
}

