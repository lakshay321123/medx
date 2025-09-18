import { callGroqChat, callOpenAIChat } from "@/lib/medx/providers";

const PATIENT_SECTION_HEADERS = [
  "What it is",
  "Symptoms / Risks",
  "What to do",
  "Treatment options",
  "Sources",
];

function stringifyContext(context: unknown): string | undefined {
  if (!context) return undefined;
  if (typeof context === "string") return context;
  try {
    return JSON.stringify(context);
  } catch {
    return String(context);
  }
}

function containsAllHeadings(text: string): boolean {
  const t = text || "";
  return PATIENT_SECTION_HEADERS.every((header) => {
    const pattern = new RegExp(`^##\\s*\\*{0,2}${header}\\*{0,2}`, "mi");
    return pattern.test(t);
  });
}

export async function runHybridPatientAnswer({
  messages,
  context,
  timeoutMs = 20_000,
}: {
  messages: Array<{ role: string; content: string }>;
  context?: unknown;
  timeoutMs?: number;
}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("No messages provided");
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUser?.content?.trim() ?? "";

  const groqDraft = await callGroqChat(messages, { temperature: 0.2, max_tokens: 1200 });
  const cleanedDraft = (groqDraft || "").trim();

  const contextString = stringifyContext(context);
  const reviewPromptParts = [
    "You are a medical editor for patient education handouts.",
    "You receive a draft answer written in Markdown with these sections (in order):",
    PATIENT_SECTION_HEADERS.map((h) => `- ${h}`).join("\n"),
    "Check the draft for factual accuracy against the trusted context (if any).",
    "Keep the same section headings and overall structure.",
    "Use calm, plain language (approx. 8th grade).",
    "Keep bullet points short (≤ 18 words) and specific.",
    "If you change or remove information, explain it briefly in the revised bullet.",
    "If context is missing, note uncertainty instead of inventing facts.",
    "Always return Markdown with the five sections in the same order.",
  ];

  const reviewSystem = reviewPromptParts.join("\n");

  const reviewUserParts = [
    userText ? `Patient question:\n${userText}` : "Patient question: (not provided)",
    `Draft to review:\n${cleanedDraft || "(empty)"}`,
    contextString ? `Trusted context:\n${contextString}` : "Trusted context: (none provided)",
    "Revise the draft only for correctness and clarity while keeping the structure.",
  ];
  const reviewUser = reviewUserParts.join("\n\n");

  const timeout = new Promise<{ ok: false }>((resolve) =>
    setTimeout(() => resolve({ ok: false }), timeoutMs)
  );

  const openAiPromise = (async () => {
    try {
      const response = await callOpenAIChat(
        [
          { role: "system", content: reviewSystem },
          { role: "user", content: reviewUser },
        ],
        { temperature: 0.1 }
      );
      const text = (response || "").trim();
      if (!text) return { ok: false } as const;
      if (!containsAllHeadings(text)) return { ok: false } as const;
      return { ok: true as const, text };
    } catch {
      return { ok: false } as const;
    }
  })();

  const result = await Promise.race([openAiPromise, timeout]);

  if (result && "ok" in result && result.ok && "text" in result) {
    return { text: result.text, provider: "openai", draft: cleanedDraft } as const;
  }

  return { text: cleanedDraft, provider: "groq", draft: cleanedDraft } as const;
}
