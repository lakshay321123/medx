import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

const HF_TOKEN = process.env.HF_API_TOKEN || "";
const BONE = process.env.HF_BONE_MODEL || "prithivMLmods/Bone-Fracture-Detection";
const CHEST = process.env.HF_CHEST_MODEL || "StanfordAIMI/CheXbert";

function pickFamily(hint = "", name = ""): "bone" | "chest" {
  const s = `${hint} ${name}`.toLowerCase();
  if (
    /(wrist|hand|finger|elbow|shoulder|humerus|tibia|fibula|knee|ankle|forearm|mura|fracture|bone)/.test(
      s
    )
  )
    return "bone";
  if (/(chest|cxr|lung|pa|ap|thorax)/.test(s)) return "chest";
  return "bone"; // default: limb/bone
}

async function callHF(buf: Buffer, modelId: string) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    body: buf,
  });
  if (r.status === 503) {
    await new Promise((r) => setTimeout(r, 2000));
    const r2 = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      body: buf,
    });
    if (!r2.ok) throw new Error(`HF ${r2.status}: ${await r2.text()}`);
    return r2.json();
  }
  if (r.status === 404)
    throw new Error(`HF 404: model "${modelId}" not deployed for Inference API`);
  if (r.status === 401 || r.status === 403)
    throw new Error(
      `HF auth error ${r.status}: check HF_API_TOKEN / model visibility`
    );
  if (!r.ok) throw new Error(`HF ${r.status}: ${await r.text()}`);
  return r.json();
}

function normalize(out: any): { label: string; score: number }[] {
  if (Array.isArray(out) && out[0]?.label && typeof out[0]?.score === "number")
    return out.sort((a: any, b: any) => b.score - a.score);
  const arr = Array.isArray(out?.scores)
    ? out.scores
    : Array.isArray(out?.logits)
    ? out.logits
    : Array.isArray(out)
    ? out
    : [];
  if (Array.isArray(arr))
    return arr
      .map((p: number, i: number) => ({ label: `label_${i}`, score: Number(p) || 0 }))
      .sort((a, b) => b.score - a.score);
  return [{ label: "Unknown", score: 0 }];
}

function impression(preds: { label: string; score: number }[]) {
  const top = preds.filter((p) => p.score >= 0.15).slice(0, 5);
  if (!top.length)
    return "No strong abnormality predicted. Correlate clinically.";
  const s = top
    .map((p) => `${p.label} ${(p.score * 100).toFixed(0)}%`)
    .join(", ");
  return `Model suggests: ${s}. AI assistance only — confirm with radiologist.`;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let type = "";
  let family: "bone" | "chest" = "bone";
  let modelId = "";
  try {
    if (!HF_TOKEN)
      return NextResponse.json(
        { ok: false, error: "HF_API_TOKEN not set" },
        { status: 500 }
      );
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const hint = (form.get("hint") as string) || "";
    const override = (form.get("model") as string) || "";

    if (!file)
      return NextResponse.json(
        { ok: false, error: "No file (expect 'file')" },
        { status: 400 }
      );
    type = (file.type || "").toLowerCase();
    if (!type.startsWith("image/"))
      return NextResponse.json(
        { ok: false, error: `Expected image/*, got ${file.type || "unknown"}` },
        { status: 400 }
      );

    const buf = Buffer.from(await file.arrayBuffer());
    family = override
      ? /chex|chest/i.test(override)
        ? "chest"
        : "bone"
      : pickFamily(hint, file.name);
    modelId = override || (family === "chest" ? CHEST : BONE);

    const raw = await callHF(buf, modelId);
    const preds = normalize(raw);

    console.log("imaging/analyze", {
      type,
      family,
      model: modelId,
      ms: Date.now() - t0,
      ok: true,
    });
    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      family,
      model: modelId,
      predictions: preds,
      impression: impression(preds),
      disclaimer: "AI assistance only — not a medical diagnosis.",
    });
  } catch (e: any) {
    console.error("imaging/analyze error", {
      type,
      family,
      model: modelId,
      ms: Date.now() - t0,
      error: e?.message || String(e),
    });
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
