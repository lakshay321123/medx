import OpenAI from "openai";
import { detectAudience, clinicianStyle, patientStyle, maxTokensFor } from "@/lib/medx/audience";
import { ensureMinDelay } from "@/lib/utils/ensureMinDelay";
import { callOpenAIChat } from "@/lib/medx/providers";
import { formatDoctorSBAR, DoctorSBAR } from "@/lib/medx/doctorFormat";

export async function POST(req: Request) {
  const { messages = [], mode, audience: audIn } = await req.json();
  const audience = detectAudience(mode, audIn);

  let system = "Validate calculations & medical logic; correct inconsistencies.\nCRISP: obey hard limits; no preamble; no derivations.";
  system += audience === "clinician" ? ("\n" + clinicianStyle) : ("\n" + patientStyle);

  const minMs = (parseInt(process.env.MIN_OUTPUT_DELAY_SECONDS || "", 10) || 10) * 1000;

  if (audience === "clinician") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const model = process.env.OPENAI_TEXT_MODEL || "gpt-5";
    const resp = await ensureMinDelay(
      client.chat.completions.create({
        model,
        messages: [{ role: "system", content: system }, ...messages],
        tools: [{
          type: "function",
          function: {
            name: "doctor_sbar",
            description: "Return concise clinician SBAR fields (no formulas).",
            parameters: {
              type: "object", additionalProperties: false,
              properties: {
                acuity: { type: "string" },
                abnormalities: { type: "array", items: { type: "string" } },
                impression: { type: "string" },
                immediate_steps: { type: "array", items: { type: "string" } },
                summary: { type: "string" },   // MDM (concise)
                recommended_tests: { type: "array", items: { type: "string" } },
                disposition: { type: "string" }
              },
              required: ["acuity","abnormalities","impression","immediate_steps","summary","recommended_tests","disposition"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "doctor_sbar" } },
        max_tokens: maxTokensFor("clinician"),
      }),
      minMs
    );
    const tool = resp.choices?.[0]?.message?.tool_calls?.[0];
    const args = tool?.function?.arguments;
    let obj: DoctorSBAR | null = null;
    try { obj = args ? JSON.parse(args) : null; } catch {}
    const reply = obj ? formatDoctorSBAR(obj) : (resp.choices?.[0]?.message?.content || "");
    return new Response(JSON.stringify({ ok: true, provider: "openai", model, audience, reply }), {
      headers: {
        "content-type": "application/json",
        "x-medx-provider": "openai",
        "x-medx-model": model,
        "x-medx-audience": "clinician",
        "x-medx-min-delay": String(minMs),
      }
    });
  }

  // Patient / Doc AI
  const reply = await ensureMinDelay(
    callOpenAIChat([{ role: "system", content: system }, ...messages], { max_tokens: maxTokensFor(audience) }),
    minMs
  );
  return new Response(JSON.stringify({ ok: true, provider: "openai", model: process.env.OPENAI_TEXT_MODEL || "gpt-5", audience, reply }), {
    headers: {
      "content-type": "application/json",
      "x-medx-provider": "openai",
      "x-medx-model": process.env.OPENAI_TEXT_MODEL || "gpt-5",
      "x-medx-audience": audience,
      "x-medx-min-delay": String(minMs),
    }
  });
}
