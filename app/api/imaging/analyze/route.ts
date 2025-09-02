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

async function callHF(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: buf });
  if (r.status === 503) {
    await new Promise(res => setTimeout(res, 2000));
    const r2 = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: buf });
    if (!r2.ok) throw new Error(`HF ${r2.status}: ${await r2.text()}`);
    return r2.json();
  }
  if (r.status === 404) throw new Error(`HF 404: model "${modelId}" not deployed for Inference API`);
  if (r.status === 401 || r.status === 403) throw new Error(`HF auth error ${r.status}: check HF_API_TOKEN / model visibility`);
  if (!r.ok) throw new Error(`HF ${r.status}: ${await r.text()}`);
  return r.json();
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

    const raw = await callHF(buf, modelId);
    const preds = normalize(raw);

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

