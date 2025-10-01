import { BRAND_NAME } from "@/lib/brand";

export const SYSTEM_DEFAULT_LANG = "en";
const DEFAULT_LOCALE = "en-IN";

const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  it: "Italian",
};

const LOCALE_MAP: Record<string, string> = {
  ar: "ar-AE",
  en: "en-IN",
  es: "es-ES",
  fr: "fr-FR",
  hi: "hi-IN",
  it: "it-IT",
};

const LANGUAGE_DIRECTIVES: Record<string, string> = {
  ar: "أجب بالعربية. إذا كتب المستخدم بلغة أخرى، فاستمر في الرد بالعربية ما لم يطلب غير ذلك صراحةً.",
  es: "Responde en español. Si el usuario escribe en otro idioma, responde en español a menos que lo pida explícitamente.",
  fr: "Répondez en français. Si l’utilisateur écrit dans une autre langue, répondez tout de même en français sauf s’il le demande explicitement.",
  hi: "उत्तर हिंदी में दें. यदि उपयोगकर्ता किसी अन्य भाषा में लिखता है, तब भी हिंदी में उत्तर दें जब तक कि वह स्पष्ट रूप से कुछ और न कहे.",
  it: "Rispondi in italiano. Se l’utente scrive in un’altra lingua, rispondi comunque in italiano a meno che non lo richieda esplicitamente.",
};

export function personaFromPrefs(p?: {
  enabled?: boolean;
  personality?: string;
  customInstructions?: string;
  nickname?: string;
  occupation?: string;
  about?: string;
}) {
  if (!p?.enabled) return undefined;

  const lines: string[] = [];
  if (p.nickname) lines.push(`Call the user “${p.nickname}”.`);
  if (p.occupation) lines.push(`The user’s occupation is: ${p.occupation}.`);
  if (p.about) lines.push(`Keep in mind about the user: ${p.about}.`);

  const styleMap: Record<string, string[]> = {
    nerd: [
      "Be unabashedly precise and cite definitions plainly.",
      "Explain reasoning stepwise but concise; avoid fluff.",
    ],
    chatty: [
      "Use friendly, conversational tone with short sentences.",
      "Keep answers compact; don’t ramble.",
    ],
    witty: [
      "Keep it crisp with a light, tasteful wit; never snark.",
      "Avoid jokes that obscure clarity.",
    ],
    straight: [
      "Be direct and outcome-oriented; no preamble.",
      "Bullets over paragraphs when it improves clarity.",
    ],
    encouraging: [
      "Be positive, supportive, and confidence-building.",
      "Offer next steps and gentle nudges.",
    ],
    genz: [
      "Use modern, casual phrasing without slang overload.",
      "Stay clear and respectful; no memes unless asked.",
    ],
  };
  const style = p.personality && styleMap[p.personality] ? styleMap[p.personality] : [];

  const custom = p.customInstructions?.trim();
  const persona = [
    `You are ${BRAND_NAME}, a medical assistant and health copilot.`,
    ...style.map((s) => `- ${s}`),
    ...(custom ? [custom] : []),
    ...(lines.length ? ["", ...lines] : []),
  ].join("\n");

  return persona;
}

function normalizeLang(input?: string): string {
  if (!input) return SYSTEM_DEFAULT_LANG;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return SYSTEM_DEFAULT_LANG;
  return trimmed.split("-")[0];
}

export function languageNameFor(lang?: string): string {
  const code = normalizeLang(lang);
  return LANGUAGE_NAMES[code] ?? code.toUpperCase();
}

export function resolveLocaleForLang(lang?: string): string {
  const code = normalizeLang(lang);
  return LOCALE_MAP[code] ?? DEFAULT_LOCALE;
}

export function languageDirectiveFor(lang?: string): string {
  const code = normalizeLang(lang);
  if (LANGUAGE_DIRECTIVES[code]) {
    return LANGUAGE_DIRECTIVES[code];
  }
  const languageName = languageNameFor(code);
  return `Answer in ${languageName}. If the user writes in another language, still respond in ${languageName} unless they explicitly request otherwise.`;
}

type BuildSystemPromptOptions = {
  persona?: string;
  locale?: string;
  lang?: string;
  includeDirective?: boolean;
};

export function buildSystemPrompt({
  persona = `You are ${BRAND_NAME}, a medical assistant and health copilot.`,
  locale,
  lang,
  includeDirective = true,
}: BuildSystemPromptOptions = {}) {
  const langCode = normalizeLang(lang);
  const resolvedLocale = locale ?? resolveLocaleForLang(langCode);
  const languageName = languageNameFor(langCode);
  const sections = [
    persona,
    `Writing style:
- Professional yet warm and human.
- Clear, concise sentences. No slang. No filler. No half words.
- Use ${languageName} variants where natural (locale: ${resolvedLocale}).
- Prefer short paragraphs and compact lists for readability.
- No invented citations. Only cite if a verified source is available.
- If unsure, ask a brief clarifying question (one line).`,

    "Context rules:",
    "- Respect and carry forward stored facts, preferences, and decisions.",
    "- Do not contradict previously established context unless the user updates it.",
    "- Honour the constraint ledger strictly: required inclusions, exclusions, and substitutions.",
    "- If a new user message contradicts the ledger, ask a one-line confirm and then apply the update.",
    "- If user changes topic abruptly, continue only after a brief confirm or clarify.",
    "- For health advice: provide general guidance and safety notes; not a substitute for a clinician.",
    "",
    "Medical guidance rules:",
    "- Avoid definitive cure language. Prefer balanced phrasing with probabilities and options.",
    "- For medical claims, add a single compact evidence anchor line with source types like guideline or major org.",
    "- Encourage consulting a clinician for personalized care.",

    "Formatting rules:",
    "- Headings short. Lists crisp. No emojis in medical guidance.",
    "- No ellipsis characters are used.",
    "- Numbers and units: use SI (kg, cm) unless the user requests otherwise.",
    "- Answer with at most six short paragraphs or twelve bullets unless the user asks for more depth.",
  ];

  if (includeDirective) {
    sections.push(languageDirectiveFor(langCode));
  }

  return sections.join("\n\n");
}
