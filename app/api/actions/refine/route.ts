import { NextResponse } from "next/server";
import OpenAI from "openai";
import { COUNTRIES } from "@/data/countries";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFINE_TEMPLATES: Record<"simpler"|"doctor"|"next", (mode: string) => string> = {
  simpler: () => "Rewrite for a layperson, shorter, same facts, keep headings.",
  doctor: () => "Rewrite for a clinician; concise medical terms; keep structure.",
  next: () => "Output only a concise 'Next steps' section.",
};

export async function POST(req: Request) {
  try {
    const { action, mode, text, country: code } = await req.json();

    if (!action || !text) {
      return NextResponse.json({ error: "Missing action or text" }, { status: 400 });
    }

    const country =
      COUNTRIES.find(c => c.code3 === code) ||
      COUNTRIES.find(c => c.code3 === "USA")!;
    const baseSystem =
      mode === "doctor"
        ? "You are a clinical assistant summarizing medical documents."
        : "You explain medical information in plain language for patients.";
    const system = `User country: ${country.code3} (${country.name}).\nLocalize counseling, OTC examples, and triage advice to this country when relevant.\nDo not invent brand names; use generics if uncertain.\n` + baseSystem;

    const template = REFINE_TEMPLATES[action as keyof typeof REFINE_TEMPLATES];
    if (!template) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const user = `${template(mode || "patient")}\n\n---\nPrevious analysis:\n${text}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const report =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No content produced.";

    return NextResponse.json({ id: crypto.randomUUID(), report });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Refine failed" },
      { status: 500 }
    );
  }
}

