export type TtsVoicePick = { voice: SpeechSynthesisVoice | null; reason: string };

export const hasSpeech = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

export function preferVoiceForLang(voices: SpeechSynthesisVoice[], appLang: string): TtsVoicePick {
  if (!voices?.length) return { voice: null, reason: "no-voices" };
  const lang = (appLang || "en").toLowerCase();

  let v = voices.find(voice => voice.lang?.toLowerCase().startsWith(lang));
  if (v) return { voice: v, reason: "match-prefix" };

  const base = lang.split("-")[0];
  v = voices.find(voice => voice.lang?.toLowerCase().startsWith(base));
  if (v) return { voice: v, reason: "match-base" };

  v = voices.find(voice => voice.default) || voices[0] || null;
  return { voice: v, reason: "fallback" };
}

export function chunkText(input: string, maxLen = 1800): string[] {
  const text = (input || "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const sentences = text.split(/([.!?।]+)\s+/);
  const chunks: string[] = [];
  let buf = "";

  for (let i = 0; i < sentences.length; i += 1) {
    const part = sentences[i];
    if (!part) continue;
    const next = buf ? `${buf} ${part}` : part;
    if (next.length > maxLen) {
      if (buf) chunks.push(buf);
      if (part.length > maxLen) {
        for (let j = 0; j < part.length; j += maxLen) {
          chunks.push(part.slice(j, j + maxLen));
        }
        buf = "";
      } else {
        buf = part;
      }
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!hasSpeech()) return resolve([]);
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length) return resolve(existing);
    const handler = () => {
      synth.removeEventListener("voiceschanged", handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", handler);
    synth.getVoices();
    setTimeout(() => resolve(synth.getVoices()), 500);
  });
}
