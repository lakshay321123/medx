import { NextResponse } from "next/server";
import { z } from "zod";

import { applyHandHeuristics } from "@/lib/imaging/handHeuristics";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL_VISION = process.env.OPENAI_VISION_MODEL || "gpt-5"; // images
const MODEL_TEXT   = process.env.OPENAI_TEXT_MODEL   || "gpt-5"; // PDFs

const FRACTURE_SCHEMA = {
  type: "object",
  properties: {
    fracture_present: { type: "boolean" },
    suspected_type: { type: "string" },
    bone: { type: "string" },
    region: { type: "string" },
    angulation_deg: { type: "number" },
    displacement_mm: { type: "number" },
    rotation_suspected: { type: "boolean" },
    need_additional_views: { type: "boolean" },
    red_flags: { type: "array", items: { type: "string" } },
    confidence_0_1: { type: "number" },
  },
  required: ["fracture_present", "confidence_0_1"],
} as const;

const FRACTURE_SYSTEM_PROMPT = `You are a radiologist. Return ONLY compact JSON matching this schema: ${JSON.stringify(
  FRACTURE_SCHEMA,
)}. No prose. If unsure, set confidence_0_1 conservatively.`;

const FindingsSchema = z.object({
  fracture_present: z.boolean(),
  suspected_type: z.string().nullable().optional(),
  bone: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  angulation_deg: z.number().nullable().optional(),
  displacement_mm: z.number().nullable().optional(),
  rotation_suspected: z.boolean().nullable().optional(),
  need_additional_views: z.boolean().nullable().optional(),
  red_flags: z.array(z.string()).nullable().optional(),
  confidence_0_1: z.number(),
});

type ImagingFindings = {
  fracture_present: boolean | null;
  suspected_type: string | null;
  bone: string | null;
  region: string | null;
  angulation_deg: number | null;
  displacement_mm: number | null;
  rotation_suspected: boolean | null;
  need_additional_views: boolean | null;
  red_flags: string[];
  confidence_0_1: number;
};

const BASE_FINDINGS: ImagingFindings = {
  fracture_present: null,
  suspected_type: null,
  bone: null,
  region: null,
  angulation_deg: null,
  displacement_mm: null,
  rotation_suspected: null,
  need_additional_views: null,
  red_flags: [],
  confidence_0_1: 0,
};

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

    // ---- PDF FIRST (robust detection) ----
    const isPdf =
      mime.includes("pdf") ||
      lowerName.endsWith(".pdf") ||
      looksLikePdfByMagic(buf);

    if (isPdf) {
      const doctorMode = (fd.get("doctorMode") || "true").toString() === "true";
      const dataUrl = `data:application/pdf;base64,${buf.toString("base64")}`;

      // Optional: server log to confirm branch
      console.log("[/api/imaging/analyze] PDF branch →", { name, mime, byMagic: looksLikePdfByMagic(buf) });

      // Patient summary (OpenAI only; no temperature)
      const pResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_TEXT,
          messages: [
            {
              role: "system",
              content: "You are a medical explainer. Summarize reports for patients in clear, calm, non-alarming language (8th–10th grade).",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Please summarize this medical report for a patient." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
      const pJson = await pResp.json();
      if (!pResp.ok) throw new Error(pJson?.error?.message || pResp.statusText);
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
              {
                role: "system",
                content:
                  "You are a clinician. Write a structured summary with headings: HPI/Context, Key Results, Interpretation, Plan, Red Flags, Limitations. Be concise and evidence-based.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Summarize this report for a doctor." },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
        });
        const dJson = await dResp.json();
        if (!dResp.ok) throw new Error(dJson?.error?.message || dResp.statusText);
        doctor = dJson.choices?.[0]?.message?.content || "";
      }

      const res = NextResponse.json({
        type: "pdf",
        filename: name,
        patient,
        doctor: doctorMode ? doctor : null,
        disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
      });
      res.headers.set("x-branch", "pdf");
      return res;
    }
    // ---- END PDF ----

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

    const imageFiles = multi.length ? multi : [file];
    const encodedImages: { dataUrl: string }[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const current = imageFiles[i];
      const displayName = (current as any).name || name || "upload";
      const currentName = displayName.toLowerCase();
      const currentBuf = i === 0 ? buf : Buffer.from(await current.arrayBuffer());
      let currentMime = current.type || (i === 0 ? mime : "");
      const isImage =
        (currentMime && currentMime.startsWith("image/")) ||
        /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(currentName);
      if (!isImage) {
        console.warn("[/api/imaging/analyze] unsupported MIME", {
          name: displayName,
          mime: currentMime,
          size: currentBuf.length,
        });
        return NextResponse.json(
          { error: `Unsupported MIME type for imaging: ${currentMime || "unknown"} (name: ${displayName})` },
          { status: 415 }
        );
      }
      if (!currentMime || currentMime === "application/octet-stream") {
        const ext = currentName.split(".").pop() || "";
        if (ext === "jpg" || ext === "jpeg") currentMime = "image/jpeg";
        else if (ext === "tif" || ext === "tiff") currentMime = "image/tiff";
        else currentMime = ext ? `image/${ext}` : "image/jpeg";
      }
      encodedImages.push({ dataUrl: toDataUrl(currentBuf, currentMime) });
    }

    const userContent = [
      {
        type: "text",
        text:
          "Multiple hand radiographs (may include PA, lateral, oblique). Aggregate across views to decide." +
          " Task: detect fracture on a HAND radiograph. If 5th metacarpal neck fracture → suspected_type='Boxer’s fracture'." +
          " Estimate angulation in degrees if visible on this view; otherwise set angulation_deg=null and need_additional_views=true.",
      },
      ...encodedImages,
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_VISION,
        messages: [
          {
            role: "system",
            content: FRACTURE_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    const j = await resp.json();
    if (!resp.ok) throw new Error(j?.error?.message || resp.statusText);
    const raw = j.choices?.[0]?.message?.content?.trim() || "{}";
    let findings: ImagingFindings = { ...BASE_FINDINGS };
    try {
      const parsed = JSON.parse(raw);
      const validated = FindingsSchema.safeParse(parsed);
      if (validated.success) {
        findings = {
          ...BASE_FINDINGS,
          ...validated.data,
          angulation_deg:
            validated.data.angulation_deg ?? null,
          displacement_mm:
            validated.data.displacement_mm ?? null,
          rotation_suspected:
            validated.data.rotation_suspected ?? null,
          need_additional_views:
            validated.data.need_additional_views ?? null,
          suspected_type: validated.data.suspected_type ?? null,
          bone: validated.data.bone ?? null,
          region: validated.data.region ?? null,
          red_flags: validated.data.red_flags ?? [],
          confidence_0_1: Math.max(0, Math.min(1, validated.data.confidence_0_1)),
        };
      } else {
        console.warn("[/api/imaging/analyze] vision JSON validation failed", validated.error.format());
      }
    } catch (err) {
      console.warn("[/api/imaging/analyze] vision JSON parse failed", { err, raw });
    }

    findings = applyHandHeuristics(findings);

    const res = NextResponse.json({
      type: "image",
      filename: name,
      findings,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
    res.headers.set("x-branch", "image");
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "imaging analyze failed" }, { status: 500 });
  }
}
