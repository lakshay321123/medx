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

function impression(preds:{label:string; score:number}[]) {
  const top = preds.filter(p=>p.score>=0.15).slice(0,5);
  if (!top.length) return "No strong abnormality predicted. Correlate clinically.";
  const s = top.map(p=>`${p.label} ${(p.score*100).toFixed(0)}%`).join(", ");
  return `Model suggests: ${s}. AI assistance only — confirm with radiologist.`;
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

    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      family: pickFamily(hint, file.name),
      model: modelId,
      predictions: preds,
      impression: impression(preds),
      disclaimer: "AI assistance only — not a medical diagnosis."
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

