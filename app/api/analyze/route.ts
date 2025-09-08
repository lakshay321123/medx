import { NextResponse } from "next/server";
import { extractTextFromPDF, rasterizeFirstPage } from "@/lib/pdftext";
import { COUNTRIES } from "@/data/countries";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_TEXT = process.env.OPENAI_TEXT_MODEL || "gpt-5";
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // 👇 Try parsing JSON (blob URLs)
    let json: any = null;
    try {
      json = await req.json();
    } catch {}

    if (json?.files?.length) {
      // Each file: { url, name, type }
      const results: any[] = [];

      for (const f of json.files) {
        // Fetch the blob file content from Vercel Blob URL
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`Failed to fetch blob ${f.url}`);
        const arrayBuffer = await res.arrayBuffer();

        // You can now pass Buffer to your analyzer (PDF/image parser etc.)
        // Example placeholder:
        results.push({
          name: f.name,
          type: f.type,
          size: arrayBuffer.byteLength,
          message: "File received from blob successfully",
        });
      }

      return NextResponse.json({ ok: true, files: results });
    }

    // 👇 Fallback: old FormData (single upload)
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const doctorMode = fd.get("doctorMode") === "true";
    const code = (fd.get("country") as string) || "USA";
    const note = (fd.get("note") as string | null)?.trim() || "";
    const threadId = (fd.get("threadId") as string) || null;
    const sourceHash = (fd.get("sourceHash") as string) || undefined;
    const country =
      COUNTRIES.find(c => c.code3 === code) ||
      COUNTRIES.find(c => c.code3 === "USA")!;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const name = file.name || "document";
    const mime = file.type || "";
    const buf = Buffer.from(new Uint8Array(await file.arrayBuffer()));

    let category = "other_medical_doc";
    let report = "";
    let dataUrl: string | null = null;
    let text = "";
    let obsIds: string[] = [];

    if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
      text = await extractTextFromPDF(buf);
      if (text) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const cookie = req.headers.get("cookie") || undefined;
        try {
          const ingestResp = await fetch(new URL("/api/ingest/from-text", baseUrl), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify({
              threadId,
              text,
              sourceHash,
              defaults: { meta: { source_type: "pdf" } },
            }),
          });
          const ingestJson = await ingestResp.json().catch(() => ({}));
          obsIds = Array.isArray(ingestJson.ids) ? ingestJson.ids : [];
        } catch (e) {
          console.error("ingest failed", e);
        }
      }
      if (text.length > 100) {
        category = await classifyText(text);
        const basePrompt = promptForCategory(category, doctorMode);
        const systemPrompt = `User country: ${country.code3} (${country.name}).\nLocalize counseling, OTC examples, and triage advice to this country when relevant.\nDo not invent brand names; use generics if uncertain.\n` + basePrompt;
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
              {
                role: "user",
                content: `User note (optional): ${note || "not provided"}\n---\n${text.slice(0, 15000)}`,
              },
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
      const basePrompt = promptForCategory(category, doctorMode);
      const systemPrompt = `User country: ${country.code3} (${country.name}).\nLocalize counseling, OTC examples, and triage advice to this country when relevant.\nDo not invent brand names; use generics if uncertain.\n` + basePrompt;
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
            {
              role: "user",
              content: [
                ...(note ? [{ type: "text", text: note }] : []),
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
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
      obsIds,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze failed" }, { status: 500 });
  }
}

