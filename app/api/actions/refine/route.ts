import { NextResponse } from "next/server";
import { llmCall } from "@/lib/llm/call";
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

      const msg = await llmCall(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { tier: "balanced", fallbackTier: "smart", temperature: 0.2 }
      );

      const report = msg?.content?.trim() || "No content produced.";

      return NextResponse.json({ id: crypto.randomUUID(), report });
    } catch (err: any) {
      console.error("LLM_ERROR", err);
      const status = err?.status ?? err?.response?.status ?? 500;
      return NextResponse.json({ error: "LLM request failed" }, { status });
    }
  }

