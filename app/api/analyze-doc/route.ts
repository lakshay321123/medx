import { NextResponse } from "next/server";

const OAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = (fd.get("file") || fd.get("pdf") || fd.get("document")) as File | null;
    const doctorMode = (fd.get("doctorMode") || "true").toString() === "true";
    if (!file) return NextResponse.json({ error: "file missing" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString("base64");
    const dataUrl = `data:application/pdf;base64,${b64}`;

    // Patient summary
    const pResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a medical explainer. Summarize reports for patients in clear, non-alarming language (8th–10th grade).",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please summarize this medical report for a patient." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
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
          model: MODEL,
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
          temperature: 0.2,
        }),
      });
      const dJson = await dResp.json();
      if (!dResp.ok) throw new Error(dJson?.error?.message || dResp.statusText);
      doctor = dJson.choices?.[0]?.message?.content || "";
    }

    return NextResponse.json({
      patient,
      doctor: doctorMode ? doctor : null,
      disclaimer: "AI assistance only — not a medical diagnosis. Confirm with a clinician.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "analyze-doc failed" }, { status: 500 });
  }
}
