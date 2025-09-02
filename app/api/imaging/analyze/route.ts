import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const HF_TOKEN = process.env.HF_API_TOKEN || process.env.HF_API_KEY || "";
const BONE =
  process.env.HF_BONE_MODEL ||
  process.env.HF_XRAY_MODEL_ID ||
  "prithivMLmods/Bone-Fracture-Detection";
const CHEST = process.env.HF_CHEST_MODEL || "keremberke/yolov8m-chest-xray-classification";
const OA_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

function guessFamily(hint = "", name = ""): "bone" | "chest" {
  const s = `${hint} ${name}`.toLowerCase();
  if (/(wrist|hand|finger|elbow|shoulder|humerus|tibia|fibula|knee|ankle|forearm|mura|fracture|bone)/.test(s)) return "bone";
  if (/(chest|cxr|lung|pa|ap|thorax)/.test(s)) return "chest";
  return "bone"; // default
}

function mapRegion(str = "") {
  const s = str.toLowerCase();
  if (/(tibia|fibula|ankle|lower leg)/.test(s)) return "lower leg";
  if (/(wrist|hand|finger)/.test(s)) return "wrist";
  if (/(chest|lung|thorax)/.test(s)) return "chest";
  if (/(shoulder|humerus)/.test(s)) return "shoulder";
  return "unspecified";
}

function pickCandidates(fam: "bone" | "chest", override = "") {
  if (override) return { classifiers: [override], generators: [] as string[] };
  return fam === "bone"
    ? { classifiers: [BONE], generators: [] as string[] }
    : { classifiers: [CHEST], generators: [] as string[] };
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

async function callOpenAIVision(
  buf: Buffer,
  mime: string,
  family: "bone" | "chest",
  region: string
) {
  if (!OA_KEY) return null;
  const b64 = buf.toString("base64");
  const prompt = `You are a radiology assistant. Analyze this ${family} X-ray of the ${region}. Respond with STRICT JSON {\n  \"fractured_prob\": number between 0 and 1,\n  \"findings\": string array,\n  \"impression\": string\n} then a short explanation.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 300,
    }),
  });
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "";
  let o: any = {};
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) o = JSON.parse(m[0]);
  } catch {}
  return {
    fractured_prob: typeof o.fractured_prob === "number" ? o.fractured_prob : undefined,
    findings: Array.isArray(o.findings) ? o.findings.map(String) : undefined,
    impression: typeof o.impression === "string" ? o.impression : undefined,
    raw,
  };
}

// normalize HF outputs into [{label, score}] format
function normalize(out: any): { label: string; score: number }[] {
  if (Array.isArray(out) && out[0]?.label && typeof out[0]?.score === "number") {
    return [...out].sort((a: any, b: any) => b.score - a.score);
  }
  const arr = Array.isArray(out?.scores)
    ? out.scores
    : Array.isArray(out?.logits)
    ? out.logits
    : Array.isArray(out)
    ? out
    : [];
  if (Array.isArray(arr)) {
    return arr
      .map((p: number, i: number) => ({ label: `label_${i}`, score: Number(p) || 0 }))
      .sort((a, b) => b.score - a.score);
  }
  return [{ label: "Unknown", score: 0 }];
}

function band(p: number) {
  if (p >= 0.85) return { band: "high", text: "High" } as const;
  if (p >= 0.6) return { band: "moderate", text: "Moderate" } as const;
  if (p >= 0.4) return { band: "borderline", text: "Borderline" } as const;
  return { band: "low", text: "Low" } as const;
}

function boneSignals(preds: { label: string; score: number }[]) {
  const m = Object.fromEntries(preds.map((p) => [p.label.toLowerCase(), p.score]));
  const frac = m["fracture"] ?? m["fractured"] ?? 0;
  const normal = m["normal"] ?? 1 - frac;
  return { frac, normal };
}

function humanTemplate(
  family: "bone" | "chest",
  preds: { label: string; score: number }[],
  hint?: string
) {
  const top = [...preds].sort((a, b) => b.score - a.score)[0];
  if (family === "bone") {
    const { frac } = boneSignals(preds);
    const b = band(frac);
    const site = (hint || "bone").toLowerCase();
    if (b.band === "high") {
      return {
        patientSummary: `The ${site} X-ray strongly suggests a fracture.`,
        clinicianNote: `• Binary classifier indicates fracture ≈${Math.round(
          frac * 100
        )}% (High confidence)\n• Consider immobilization and orthopaedic review as clinically indicated`,
      };
    }
    if (b.band === "moderate") {
      return {
        patientSummary: `The ${site} X-ray may show a fracture.`,
        clinicianNote: `• Suspicious for fracture ≈${Math.round(
          frac * 100
        )}%\n• Consider additional views/CT based on exam`,
      };
    }
    if (b.band === "borderline") {
      return {
        patientSummary: `The ${site} X-ray is inconclusive for a fracture.`,
        clinicianNote: `• Equivocal probability ≈${Math.round(
          frac * 100
        )}%\n• Correlate with focal tenderness; repeat imaging if needed`,
      };
    }
    return {
      patientSummary: `No obvious fracture is seen in the ${site} X-ray.`,
      clinicianNote: `• Model favors no fracture (top: ${top.label} ${Math.round(
        top.score * 100
      )}%)`,
    };
  }
  const strong = preds.filter((p) => p.score >= 0.15).slice(0, 5);
  if (!strong.length) {
    return {
      patientSummary: "No strong abnormality seen on the chest X-ray by the AI model.",
      clinicianNote: "• No label ≥15%. Consider clinical context.",
    };
  }
  const list = strong.map((p) => `${p.label} ${Math.round(p.score * 100)}%`).join(", ");
  return {
    patientSummary: `The chest X-ray AI highlights: ${list}.`,
    clinicianNote: `• Top chest labels (≥15%): ${list}\n• Correlate clinically`,
  };
}

async function llmPolish(
  base: { patientSummary: string; clinicianNote: string },
  ctx: { family: "bone" | "chest"; region: string; model: string; preds: { label: string; score: number }[] }
) {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY) return null;
  const pred_lines = ctx.preds
    .slice(0, 5)
    .map((p) => `• ${p.label}: ${p.score.toFixed(2)}`)
    .join("\n");
  const prompt = `Context:\n- Modality: X-ray\n- Family: ${ctx.family}\n- Region/Hint: ${ctx.region}\n- Model: ${ctx.model}\n\nModel outputs (top 5):\n${pred_lines}\n\nInitial draft:\nPatient: ${base.patientSummary}\nClinician:\n${base.clinicianNote}\n\nRewrite both sections concisely (2–3 sentences for patient, 2–3 short bullets for clinician). Keep probabilities and avoid overreach.`;

  const r = await fetch(process.env.LLM_BASE_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LLM_API_KEY!}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.LLM_MODEL_ID || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a clinical reporting assistant. Be concise, safe, factual." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 220,
    }),
  });
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "";
  if (!text) return null;
  const parts = text.split(/\n{2,}/);
  return {
    patientSummary: parts[0]?.trim() || base.patientSummary,
    clinicianNote: (parts[1] || base.clinicianNote).trim(),
  };
}

async function getPredictionsViaRouter(
  buf: Buffer,
  models: string[],
  tried: { id: string; status: number; ok: boolean }[]
) {
  for (const id of models) {
    let resp = await callHF_bytes(buf, id);
    if (resp.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      resp = await callHF_bytes(buf, id);
    }
    if (!resp.ok && resp.status === 400) {
      const retry = await callHF_jsonBase64(buf, id);
      resp = retry;
    }
    tried.push({ id, status: resp.status, ok: resp.ok });
    if (!resp.ok) continue;
    let out: any;
    try {
      out = JSON.parse(resp.body);
    } catch {
      out = resp.body;
    }
    return normalize(out);
  }
  return null;
}

async function getGeneratorTextViaRouter(
  buf: Buffer,
  models: string[],
  tried: { id: string; status: number; ok: boolean }[]
) {
  for (const id of models) {
    let resp = await callHF_bytes(buf, id);
    if (resp.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      resp = await callHF_bytes(buf, id);
    }
    if (!resp.ok && resp.status === 400) {
      const retry = await callHF_jsonBase64(buf, id);
      resp = retry;
    }
    tried.push({ id, status: resp.status, ok: resp.ok });
    if (!resp.ok) continue;
    let out: any;
    try {
      out = JSON.parse(resp.body);
    } catch {
      out = resp.body;
    }
    const txt = typeof out === "string" ? out : out?.generated_text || "";
    if (txt.trim()) return txt;
  }
  return null;
}

function overallFrom(
  perImage: Array<{ fileName: string; predictions: { label: string; score: number }[] }>,
  region: string,
  family: "bone" | "chest"
) {
  if (family === "bone") {
    const votes = perImage.map((x) => {
      const m = Object.fromEntries(x.predictions.map((p) => [p.label.toLowerCase(), p.score]));
      let v = m["fracture"] ?? m["fractured"] ?? 0;
      const oap = (x as any).openaiProb;
      if (typeof oap === "number") {
        v = 0.7 * oap + 0.3 * v; // favor OpenAI
      }
      return v;
    });
    const highIdx = votes
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v >= 0.85)
      .map((x) => x.i);
    const modIdx = votes
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v >= 0.6 && x.v < 0.85)
      .map((x) => x.i);
    const noneIdx = votes
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v < 0.4)
      .map((x) => x.i);
    const tag = (idx: number) => String.fromCharCode(97 + idx);
    let summary = "";
    if (highIdx.length)
      summary += `Views ${highIdx.map(tag).join(", ")} strongly suggest a ${region} fracture. `;
    if (modIdx.length) summary += `Views ${modIdx.map(tag).join(", ")} are suspicious for fracture. `;
    if (noneIdx.length) summary += `Views ${noneIdx.map(tag).join(", ")} show no obvious fracture. `;
    summary = summary.trim() || `No strong abnormality predicted.`;
    const triage = highIdx.length
      ? "Immobilize and arrange urgent orthopaedic assessment."
      : modIdx.length
      ? "Obtain additional views or CT depending on exam."
      : "Manage per clinical context; return precautions if symptoms persist.";
    return { summary, triage };
  }

  const labels: Record<string, number> = {};
  for (const img of perImage) {
    for (const p of img.predictions) {
      if (p.score >= 0.15) labels[p.label] = Math.max(labels[p.label] || 0, p.score);
    }
  }
  const top = Object.entries(labels)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  const summary = top.length
    ? `Across all views, AI highlights: ${top.join(", ")}.`
    : `No strong abnormality predicted.`;
  const triage = "Manage per clinical context; return precautions if symptoms persist.";
  return { summary, triage };
}

export async function POST(req: NextRequest) {
  try {
    if (!HF_TOKEN)
      return NextResponse.json({ ok: false, error: "HF_API_TOKEN not set" }, { status: 500 });

    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files.length)
      return NextResponse.json({ ok: false, error: "No files (expect 'files[]')" }, { status: 400 });
    for (const f of files) {
      if (!(f.type || "").toLowerCase().startsWith("image/")) {
        return NextResponse.json(
          { ok: false, error: `Expected image/*, got ${f.type || "unknown"}` },
          { status: 400 }
        );
      }
    }

    const hint = (form.get("hint") as string) || "";
    const override = (form.get("model") as string) || "";
    const mode = (form.get("mode") as string) || "both"; // "both" | "openai" | "hf"
    const fam = guessFamily(hint, files.map((f) => f.name).join(" "));
    const region = mapRegion(hint || files.map((f) => f.name).join(" "));

    const perImage: any[] = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const { classifiers, generators } = pickCandidates(fam, override);
      const tried: { id: string; status: number; ok: boolean }[] = [];
      let predictions = mode !== "openai" ? await getPredictionsViaRouter(buf, classifiers, tried) : null;
      const oaRes = mode !== "hf"
        ? await callOpenAIVision(buf, file.type || "image/jpeg", fam, region).catch(() => null)
        : null;
      if (oaRes) {
        tried.push({ id: `openai:${OPENAI_VISION_MODEL}`, status: 200, ok: true });
      } else {
        tried.push({ id: `openai:${OPENAI_VISION_MODEL}`, status: 500, ok: false });
      }
      if (process.env.XRAY_ENABLE_DEBUG === "true") {
        console.log("OpenAI Vision", {
          responded: !!oaRes,
          prob: oaRes?.fractured_prob,
          model: OPENAI_VISION_MODEL,
        });
      }
      if (!predictions) predictions = [{ label: "Unknown", score: 0 }];
      const genText = mode !== "openai" ? await getGeneratorTextViaRouter(buf, generators, tried) : null;
      let interp = humanTemplate(fam, predictions, file.name || region);
      if (genText?.trim()) {
        interp = {
          patientSummary: interp.patientSummary,
          clinicianNote: `${genText.trim()}\n\n${interp.clinicianNote}`,
        };
      }
      if (oaRes?.findings?.length || oaRes?.impression) {
        const lines: string[] = [];
        if (Array.isArray(oaRes.findings) && oaRes.findings.length) {
          lines.push(...oaRes.findings.map((f) => `• ${f}`));
        }
        if (oaRes.impression) lines.push(oaRes.impression);
        interp = {
          patientSummary: interp.patientSummary,
          clinicianNote: `${lines.join("\n")}\n\n${interp.clinicianNote}`,
        };
      }
      const polished = await llmPolish(interp, {
        family: fam,
        region,
        model: tried.find((t) => t.ok)?.id || "unknown",
        preds: predictions,
      }).catch(() => null);
      perImage.push({
        fileName: file.name,
        predictions,
        interpretation: polished || interp,
        modelsTried: tried,
        openaiProb: oaRes?.fractured_prob ?? null,
        openaiModel: OPENAI_VISION_MODEL,
        openaiResponded: !!oaRes,
      });
    }

    const overall = overallFrom(perImage, region, fam);

    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      family: fam,
      region,
      perImage,
      overall,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

