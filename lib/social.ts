const norm = (s: string) =>
  s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const GREET = new Set([
  "hi","hey","hello","yo","sup","hey there","hiya","namaste","gm","good morning","good afternoon","good evening","greetings"
]);

const THANKS = new Set([
  "thanks","thank you","ty","thx","awesome","nice","love it","great","perfect","cool","fantastic","amazing","appreciate it","much appreciated"
]);

const BYE = new Set([
  "bye","goodbye","cya","see ya","see you","later","ttyl","talk later","thanks bye"
]);

const YES = new Set([
  "yes","yep","yeah","yup","sure","ok","okay","k","alright","sounds good","go ahead","do it","please do","proceed"
]);

const NO = new Set([
  "no","nope","nah","don’t","dont","do not","stop","cancel","not now","later"
]);

const MAYBE = new Set([
  "maybe","not sure","unsure","perhaps","possibly","depends"
]);

const REPEAT = new Set([
  "repeat","again","say that again","come again","what was that","pardon","one more time"
]);

const SIMPLER = new Set([
  "simpler","simplify","eli5","explain like i am 5","explain like i'm 5","simple words","easier please","plain english"
]);

const SHORTER = new Set([
  "shorter","tldr","tl;dr","summary","briefly","in short","quick summary"
]);

const LONGER = new Set([
  "longer","more details","expand","elaborate","go deeper","explain more","details please"
]);

const NEXT = new Set([
  "what next","next steps","now what","what's next","whats next","next"
]);

export type SocialIntent =
  | "greeting"
  | "appreciation"
  | "goodbye"
  | "yes"
  | "no"
  | "maybe"
  | "repeat"
  | "simpler"
  | "shorter"
  | "longer"
  | "next"
  | null;

export function detectSocialIntent(text: string): SocialIntent {
  const s = norm(text);
  const words = s.split(" ");
  const short = words.length <= 6;

  const has = (set: Set<string>) => {
    if (set.has(s)) return true;
    if (short) {
      for (const k of set) {
        if (s === k || s.startsWith(k)) return true;
      }
    }
    return false;
  };

  if (has(GREET)) return "greeting";
  if (has(THANKS)) return "appreciation";
  if (has(BYE)) return "goodbye";
  if (has(YES)) return "yes";
  if (has(NO)) return "no";
  if (has(MAYBE)) return "maybe";
  if (has(REPEAT)) return "repeat";
  if (has(SIMPLER)) return "simpler";
  if (has(SHORTER)) return "shorter";
  if (has(LONGER)) return "longer";
  if (has(NEXT)) return "next";
  return null;
}

export function replyForSocialIntent(kind: SocialIntent, mode: "patient"|"doctor"|"research"|"therapy" = "patient"): string {
  switch (kind) {
    case "greeting":
      if (mode === "therapy") {
        return "Hi, I’m here with you. Want to tell me what’s on your mind today? 💙";
      }
      return mode === "doctor"
        ? "Hi! How can I help today? Share a condition or report, and I’ll keep it concise."
        : "Hi! 👋 How can I help today? You can describe symptoms or upload a report.";
    case "appreciation":
      return "Glad that helped! Want to go deeper or try something else?";
    case "goodbye":
      return "Take care! If you need me again, I’m here.";
    case "yes":
      return "Got it — proceeding. Anything specific you want me to focus on?";
    case "no":
      return "Okay — I won’t proceed. What would you like instead?";
    case "maybe":
      return "No problem — I can outline options. Which direction sounds best?";
    case "repeat":
      return "Sure — here’s a quick repeat of the last answer:";
    case "simpler":
      return "Okay — I’ll explain it more simply.";
    case "shorter":
      return "Sure — here’s the brief version.";
    case "longer":
      return "Alright — expanding with more detail.";
    case "next":
      return "Next steps coming up.";
    default:
      return "";
  }
}

