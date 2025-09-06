import { NextRequest, NextResponse } from "next/server";
import { flags } from "@/lib/flags";

export async function GET(req: NextRequest) {
  if (!flags.enableLOINC) return NextResponse.json({ disabled: true });
  const code = new URL(req.url).searchParams.get("code") || "";
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const url = `https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&code=${encodeURIComponent(code)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: "upstream error" }, { status: 502 });
  const j = await r.json();

  let display: string | null = null;
  const props: Record<string, any> = {};
  for (const p of j.parameter || []) {
    if (p.name === "display") display = p.valueString;
    if (p.name === "property") {
      const codePart = p.part?.find((pp: any) => pp.name === "code");
      const valPart = p.part?.find((pp: any) => pp.name === "valueCode" || pp.name === "valueCoding" || pp.name === "valueString");
      const c = codePart?.valueCode?.toLowerCase();
      const v = valPart?.code || valPart?.valueCode || valPart?.valueString;
      if (c) props[c] = v;
    }
  }

  const res = {
    code,
    display,
    properties: {
      component: props.component,
      property: props.property,
      time: props.time,
      system: props.system,
      scale: props.scale,
      method: props.method,
    },
  };

  return NextResponse.json(res);
}
