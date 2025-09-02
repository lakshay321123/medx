import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const HF_TOKEN = process.env.HF_API_TOKEN || "";
const BONE = process.env.HF_BONE_MODEL  || "prithivMLmods/Bone-Fracture-Detection";
const CHEST = process.env.HF_CHEST_MODEL || "keremberke/yolov8m-chest-xray-classification";

// allow-list to prevent text-only models being used for image inputs
const IMAGE_MODELS = new Set([BONE, CHEST,
  "prithivMLmods/Bone-Fracture-Detection",
  "keremberke/yolov8m-chest-xray-classification",
  "keremberke/yolov8s-chest-xray-classification",
  "lxyuan/vit-xray-pneumonia-classification"
]);

function pickFamily(hint = "", name = ""): "bone" | "chest" {
  const s = `${hint} ${name}`.toLowerCase();
  if (/(wrist|hand|finger|elbow|shoulder|humerus|tibia|fibula|knee|ankle|forearm|mura|fracture|bone)/.test(s)) return "bone";
  if (/(chest|cxr|lung|pa|ap|thorax)/.test(s)) return "chest";
  return "bone"; // default
}

// HF caller: raw bytes
async function callHF_bytes(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    body: buf,
  });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, body: txt };
}

// HF caller: JSON/base64 payload
async function callHF_jsonBase64(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const payload = { inputs: buf.toString("base64") };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, body: txt };
}

// normalize HF outputs into [{label, score}] format
function normalize(out: any): {label:string; score:number}[] {
  if (Array.isArray(out) && out[0]?.label && typeof out[0]?.score === "number") {
    return [...out].sort((a:any,b:any)=>b.score-a.score);
  }
  const arr = Array.isArray(out?.scores) ? out.scores
           : Array.isArray(out?.logits) ? out.logits
           : Array.isArray(out) ? out : [];
  if (Array.isArray(arr)) {
    return arr.map((p:number,i:number)=>({ label:`label_${i}`, score:Number(p)||0 })).sort((a,b)=>b.score-a.score);
  }
  return [{ label:"Unknown", score:0 }];
}

function band(p: number) {
  if (p >= 0.85) return { band: "high", text: "High" } as const;
  if (p >= 0.60) return { band: "moderate", text: "Moderate" } as const;
  if (p >= 0.40) return { band: "borderline", text: "Borderline" } as const;
  return { band: "low", text: "Low" } as const;
}

function boneSignals(preds: {label:string;score:number}[]) {
  const m = Object.fromEntries(preds.map(p => [p.label.toLowerCase(), p.score]));
  const frac = m["fracture"] ?? m["fractured"] ?? 0;
  const normal = m["normal"] ?? (1 - frac);
  return { frac, normal };
}

function humanTemplate(family: "bone"|"chest", preds: {label:string;score:number}[], hint?: string) {
  const top = [...preds].sort((a,b)=>b.score-a.score)[0];
  if (family === "bone") {
    const { frac } = boneSignals(preds);
    const b = band(frac);
    const site = (hint || "bone").toLowerCase();
    if (b.band === "high") {
      return {
        patientSummary: `The ${site} X-ray strongly suggests a fracture.`,
        clinicianNote: `• Binary classifier indicates fracture ≈${Math.round(frac*100)}% (High confidence)\n• Consider immobilization and orthopaedic review as clinically indicated`
      };
    }
    if (b.band === "moderate") {
      return {
        patientSummary: `The ${site} X-ray may show a fracture.`,
        clinicianNote: `• Suspicious for fracture ≈${Math.round(frac*100)}%\n• Consider additional views/CT based on exam`
      };
    }
    if (b.band === "borderline") {
      return {
        patientSummary: `The ${site} X-ray is inconclusive for a fracture.`,
        clinicianNote: `• Equivocal probability ≈${Math.round(frac*100)}%\n• Correlate with focal tenderness; repeat imaging if needed`
      };
    }
    return {
      patientSummary: `No obvious fracture is seen in the ${site} X-ray.`,
      clinicianNote: `• Model favors no fracture (top: ${top.label} ${Math.round(top.score*100)}%)`
    };
  }
  const strong = preds.filter(p => p.score >= 0.15).slice(0,5);
  if (!strong.length) {
    return {
      patientSummary: "No strong abnormality seen on the chest X-ray by the AI model.",
      clinicianNote: "• No label ≥15%. Consider clinical context."
    };
  }
  const list = strong.map(p => `${p.label} ${Math.round(p.score*100)}%`).join(", ");
  return {
    patientSummary: `The chest X-ray AI highlights: ${list}.`,
    clinicianNote: `• Top chest labels (≥15%): ${list}\n• Correlate clinically`
  };
}

async function llmPolish(ctx: {
  family: "bone"|"chest", hint?: string, model: string,
  preds: {label:string;score:number}[], base: {patientSummary:string; clinicianNote:string}
}) {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY) return null;
  const pred_lines = ctx.preds.slice(0,5).map(p=>`• ${p.label}: ${p.score.toFixed(2)}`).join("\n");
  const prompt = `Context:\n- Modality: X-ray\n- Family: ${ctx.family}\n- Region/Hint: ${ctx.hint || "unspecified"}\n- Model: ${ctx.model}\n\nModel outputs (top 5):\n${pred_lines}\n\nInitial draft:\nPatient: ${ctx.base.patientSummary}\nClinician:\n${ctx.base.clinicianNote}\n\nRewrite both sections concisely (2–3 sentences for patient, 2–3 short bullets for clinician). Keep probabilities and avoid overreach.`;

  const r = await fetch(process.env.LLM_BASE_URL!, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.LLM_API_KEY!}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.LLM_MODEL_ID || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a clinical reporting assistant. Be concise, safe, factual." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 220
    })
  });
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "";
  if (!text) return null;
  const parts = text.split(/\n{2,}/);
  return {
    patientSummary: parts[0]?.trim() || ctx.base.patientSummary,
    clinicianNote: (parts[1] || ctx.base.clinicianNote).trim()
  };
}


export async function POST(req: NextRequest) {
  try {
    if (!HF_TOKEN) return NextResponse.json({ ok:false, error:"HF_API_TOKEN not set" }, { status: 500 });
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const hint = (form.get("hint") as string) || "";
    const override = (form.get("model") as string) || "";

    if (!file) return NextResponse.json({ ok:false, error:"No file (expect 'file')" }, { status: 400 });
    if (!(file.type||"").toLowerCase().startsWith("image/"))
      return NextResponse.json({ ok:false, error:`Expected image/*, got ${file.type||"unknown"}` }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());

    // choose model: override > hint/filename > env defaults
    let modelId = override || (pickFamily(hint, file.name) === "chest" ? CHEST : BONE);
    if (!IMAGE_MODELS.has(modelId)) {
      return NextResponse.json({ ok:false, error:`Model "${modelId}" is not configured for image inputs.` }, { status: 400 });
    }

    console.log("imaging model:", modelId);

    // 1) try bytes
    let resp = await callHF_bytes(buf, modelId);

    // handle cold-start
    if (resp.status === 503) {
      await new Promise(r => setTimeout(r, 2000));
      resp = await callHF_bytes(buf, modelId);
    }

    // 404/401/403: clear, user-facing errors
    if (resp.status === 404) throw new Error(`HF 404: model "${modelId}" not deployed for Inference API`);
    if (resp.status === 401 || resp.status === 403) throw new Error(`HF auth ${resp.status}: check HF_API_TOKEN / model visibility`);

    // 2) if 400 (e.g., "'NoneType'...lower"), retry JSON/base64
    if (!resp.ok && resp.status === 400) {
      const retry = await callHF_jsonBase64(buf, modelId);
      if (!retry.ok) throw new Error(`HF ${retry.status}: ${retry.body}`);
      resp = retry;
    }

    // any other non-ok
    if (!resp.ok) throw new Error(`HF ${resp.status}: ${resp.body}`);

    // parse final
    let out: any;
    try { out = JSON.parse(resp.body); } catch { out = resp.body; }

    const preds = normalize(out);

    const family = pickFamily(hint, file.name);
    const baseInterp = humanTemplate(family, preds, hint);
    const polished = await llmPolish({ family, hint, model: modelId, preds, base: baseInterp }) || baseInterp;

    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      family,
      region: hint || "unspecified",
      model: modelId,
      predictions: preds,
      interpretation: polished,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician."
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

