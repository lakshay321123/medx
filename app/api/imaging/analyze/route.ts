import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const HF_TOKEN = process.env.HF_API_TOKEN || "";
const DEF_CHEST = process.env.HF_CHEST_MODEL || "StanfordAIMI/CheXbert";
const DEF_BONE  = process.env.HF_BONE_MODEL  || "nibort/xray-fracture-detection";

function pickModel(fileName: string = "", mime: string = "", hint?: string) {
  const n = (fileName || "").toLowerCase();
  const h = (hint || "").toLowerCase();
  const chestHints = /(chest|cxr|lung|pa|ap)/;
  const boneHints  = /(wrist|hand|elbow|shoulder|humerus|tibia|fibula|knee|ankle|finger|forearm|mura|fracture)/;
  if (boneHints.test(n) || boneHints.test(h)) return { id: DEF_BONE, region: "Bone/Limb" };
  if (chestHints.test(n) || chestHints.test(h)) return { id: DEF_CHEST, region: "Chest" };
  // default to chest to avoid wildly wrong fracture calls on random images
  return { id: DEF_CHEST, region: "Chest" };
}

function impressionFrom(preds: Array<{label:string; score:number}>) {
  if (!Array.isArray(preds) || !preds.length) return "No strong abnormality predicted by the model. Correlate clinically.";
  const top = preds
    .filter(p => typeof p.score === "number")
    .sort((a,b)=>b.score - a.score)
    .slice(0,5)
    .filter(p => p.score >= 0.15);
  if (!top.length) return "No strong abnormality predicted by the model. Correlate clinically.";
  const s = top.map(p => `${p.label} (${(p.score*100).toFixed(0)}%)`).join(", ");
  return `Model suggests: ${s}. AI assistance only — confirm with radiologist.`;
}

async function callHF(image: Buffer, modelId: string) {
  if (!HF_TOKEN) throw new Error("HF_API_TOKEN not set");
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: image });
  if (res.status === 503) { // cold start retry
    await new Promise(r => setTimeout(r, 2000));
    const retry = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: image });
    if (!retry.ok) throw new Error(`HF ${retry.status}: ${await retry.text()}`);
    return retry.json();
  }
  if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);
  return res.json();
}

// Normalize HF outputs into [{label, score}]
function normalize(out: any) {
  if (Array.isArray(out) && out[0]?.label && typeof out[0]?.score === "number") {
    return out.map((o:any)=>({label:o.label, score:o.score})).sort((a,b)=>b.score - a.score);
  }
  if (Array.isArray(out) && typeof out[0] === "number") {
    const probs = out; // already probs or logits — treat as probs
    return probs.map((p:number, i:number)=>({ label: `label_${i}`, score: p })).sort((a,b)=>b.score - a.score);
  }
  const arr = out?.scores || out?.logits;
  if (Array.isArray(arr)) {
    return arr.map((p:number, i:number)=>({ label: `label_${i}`, score: p })).sort((a,b)=>b.score - a.score);
  }
  return [{ label: "Unknown", score: 0, raw: out }];
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const hint = (form.get("hint") as string) || ""; // optional body-part hint from UI

    if (!file) return NextResponse.json({ ok:false, error: "No file (expect 'file')" }, { status: 400 });
    if (!(file.type || "").toLowerCase().startsWith("image/")) {
      return NextResponse.json({ ok:false, error: `Expected image/*, got ${file.type||"unknown"}` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());

    const chosen = pickModel(file.name, file.type, hint);
    const raw = await callHF(buf, chosen.id);
    const predictions = normalize(raw);

    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      region: chosen.region,
      model: chosen.id,
      predictions,
      impression: impressionFrom(predictions),
      disclaimer: "AI aid — not a medical diagnosis. Always confirm with clinician."
    });

  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}

