import { detectAudience, clinicianStyle, patientStyle, maxTokensFor } from "@/lib/medx/audience";
import { callOpenAIChat } from "@/lib/medx/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { messages = [], mode, audience: audIn } = await req.json();
  const audience = detectAudience(mode, audIn);

  let system = "Validate calculations & medical logic; correct inconsistencies.\nCRISP: obey hard limits; no preamble; no derivations.";
  system += audience === "clinician" ? ("\n" + clinicianStyle) : ("\n" + patientStyle);

  const upstream = await callOpenAIChat([{ role: "system", content: system }, ...messages], {
    stream: true,
    max_tokens: maxTokensFor(audience),
  });
  if (!upstream.body) return new Response("OpenAI stream error", { status: 500 });

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const m = line.match(/^data: (.*)$/);
          if (!m) continue;
          if (m[1].trim() === "[DONE]") continue;
          try {
            const json = JSON.parse(m[1]);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(enc.encode(delta));
          } catch {}
        }
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
      "x-medx-audience": audience,
      "x-medx-min-delay": "0",
    }
  });
}
