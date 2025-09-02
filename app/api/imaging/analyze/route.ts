import { NextRequest, NextResponse } from "next/server";
import { guessFamily, pickCandidates } from "@/lib/imaging/modelRegistry";
import { runHF, parseHF } from "@/lib/imaging/hfClient";
import { humanTemplate, llmPolish, mapRegion } from "@/lib/imaging/narrative";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.HF_API_TOKEN) return NextResponse.json({ ok:false, error:"HF_API_TOKEN not set" }, { status:500 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const hint = (form.get("hint") as string) || "";
    const override = (form.get("model") as string) || "";

    if (!file) return NextResponse.json({ ok:false, error:"No file (expect 'file')" }, { status:400 });
    if (!(file.type||"").toLowerCase().startsWith("image/")) return NextResponse.json({ ok:false, error:`Expected image/*, got ${file.type||"unknown"}` }, { status:400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const fam = guessFamily(hint, file.name);
    const { classifiers, generators } = pickCandidates(fam);

    // If developer passes override, try it first
    type Step = { id: string; input: "bytes" | "json_base64"; kind: "override" | "classifier" | "generator" };
    const tryOrder: Step[] = override
      ? [{ id: override, input: "bytes", kind: "override" }]
      : [];

    // 1) Classifier(s) → probabilities
    classifiers.forEach(m => tryOrder.push({ id: m.id, input: m.input, kind: "classifier" as const }));

    // 2) Generator(s) → narrative text (best effort)
    generators.forEach(m => tryOrder.push({ id: m.id, input: m.input, kind: "generator" as const }));

    const used: { id:string; status:number; ok:boolean }[] = [];
    let predictions: { label:string; score:number }[] | null = null;
    let genText: string | null = null;

    for (const step of tryOrder) {
      const r = await runHF(buf, step.id, step.input);
      used.push({ id: step.id, status: r.status, ok: r.ok });

      if (!r.ok) continue;
      const parsed = parseHF(r.txt);

      // Heuristic normalization
      if (step.kind === "classifier") {
        // A) [{label,score}]
        if (Array.isArray(parsed) && parsed[0]?.label && typeof parsed[0]?.score === "number") {
          predictions = parsed.map((o:any)=>({ label:o.label, score:o.score }))
            .sort((a,b)=>b.score-a.score);
          continue;
        }
        // B) [0.1,0.9] → label_i
        if (Array.isArray(parsed) && typeof parsed[0] === "number") {
          predictions = parsed.map((p:number,i:number)=>({ label:`label_${i}`, score:p }))
            .sort((a,b)=>b.score-a.score);
          continue;
        }
        // C) {scores|logits}
        const arr = Array.isArray(parsed?.scores) ? parsed.scores
                 : Array.isArray(parsed?.logits) ? parsed.logits : null;
        if (arr) {
          predictions = arr.map((p:number,i:number)=>({ label:`label_${i}`, score:p }))
            .sort((a,b)=>b.score-a.score);
          continue;
        }
      }

      if (step.kind === "generator") {
        // Try to read a string or HF-style array of strings
        if (typeof parsed === "string") { genText = parsed; break; }
        if (Array.isArray(parsed) && typeof parsed[0] === "string") { genText = parsed.join("\n"); break; }
        if (Array.isArray(parsed) && parsed[0]?.generated_text) { genText = parsed.map((x:any)=>x.generated_text).join("\n\n"); break; }
      }
    }

    // Fallback predictions if none
    if (!predictions) {
      predictions = [{ label:"Unknown", score: 0 }];
    }

    // Build narrative
    const region = mapRegion(hint || file.name || "");
    const base = humanTemplate(fam, predictions, region);
    let interpreted = base;

    // If we got generator text, prepend/merge
    if (genText && genText.trim()) {
      // keep it simple: put gen text as clinician note header
      interpreted = {
        patientSummary: base.patientSummary,
        clinicianNote: `${genText.trim()}\n\n${base.clinicianNote}`
      };
    }

    // Optional LLM polish
    const llm = await llmPolish(interpreted, { family: fam, region, model: used.find(u=>u.ok)?.id || "unknown", preds: predictions }).catch(()=>null);
    if (llm) interpreted = llm;

    return NextResponse.json({
      ok: true,
      documentType: "Imaging Report",
      modality: "X-ray",
      family: fam,
      region,
      modelsTried: used,       // for dev visibility
      predictions,
      interpretation: interpreted,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician."
    });

  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status:500 });
  }
}
