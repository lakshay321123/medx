// app/api/directory/_i18nFallback.ts
type Method = "provider" | "transliterate" | "translate" | "fallback" | "none";

export function isLatin(s: string) {
  return /^[\p{Letter}\p{Number}\p{Punctuation}\p{Separator}]*$/u.test(s) && /[A-Za-z]/.test(s);
}

export function transliterateNameSafe(name: string, lang: string): { text: string; method: Method } {
  if (!name || !isLatin(name)) return { text: name, method: "none" };
  switch (lang) {
    case "hi":
      return { text: latinToDevanagariSafe(name), method: "transliterate" };
    case "ar":
      return { text: latinToArabicSafe(name), method: "transliterate" };
    case "zh":
      return { text: name, method: "fallback" };
    case "es":
    case "it":
    default:
      return { text: name, method: "fallback" };
  }
}

function latinToDevanagariSafe(s: string) {
  return s
    .replace(/ch/gi, "च")
    .replace(/sh/gi, "श")
    .replace(/th/gi, "थ")
    .replace(/ph/gi, "फ")
    .replace(/kh/gi, "ख")
    .replace(/bh/gi, "भ")
    .replace(/a/gi, "अ")
    .replace(/e/gi, "ए")
    .replace(/i/gi, "इ")
    .replace(/o/gi, "ओ")
    .replace(/u/gi, "उ")
    .replace(/b/gi, "ब")
    .replace(/c/gi, "क")
    .replace(/d/gi, "द")
    .replace(/f/gi, "फ")
    .replace(/g/gi, "ग")
    .replace(/h/gi, "ह")
    .replace(/j/gi, "ज")
    .replace(/k/gi, "क")
    .replace(/l/gi, "ल")
    .replace(/m/gi, "म")
    .replace(/n/gi, "न")
    .replace(/p/gi, "प")
    .replace(/q/gi, "क")
    .replace(/r/gi, "र")
    .replace(/s/gi, "स")
    .replace(/t/gi, "त")
    .replace(/v/gi, "व")
    .replace(/w/gi, "व")
    .replace(/x/gi, "क्‍स")
    .replace(/y/gi, "य")
    .replace(/z/gi, "ज");
}

function latinToArabicSafe(s: string) {
  return s
    .replace(/ch/gi, "تش")
    .replace(/sh/gi, "ش")
    .replace(/kh/gi, "خ")
    .replace(/th/gi, "ث")
    .replace(/gh/gi, "غ")
    .replace(/a/gi, "ا")
    .replace(/e/gi, "е")
    .replace(/i/gi, "ي")
    .replace(/o/gi, "و")
    .replace(/u/gi, "و")
    .replace(/b/gi, "ب")
    .replace(/c/gi, "ك")
    .replace(/d/gi, "د")
    .replace(/f/gi, "ف")
    .replace(/g/gi, "ج")
    .replace(/h/gi, "ه")
    .replace(/j/gi, "ج")
    .replace(/k/gi, "ك")
    .replace(/l/gi, "ل")
    .replace(/m/gi, "م")
    .replace(/n/gi, "ن")
    .replace(/p/gi, "پ")
    .replace(/q/gi, "ق")
    .replace(/r/gi, "ر")
    .replace(/s/gi, "س")
    .replace(/t/gi, "ت")
    .replace(/v/gi, "ڤ")
    .replace(/w/gi, "و")
    .replace(/x/gi, "كس")
    .replace(/y/gi, "ي")
    .replace(/z/gi, "ز");
}

const DICT: Record<string, Record<string, string>> = {
  hi: {
    street: "सड़क",
    road: "रोड",
    lane: "गली",
    market: "बाज़ार",
    hospital: "अस्पताल",
    clinic: "क्लिनिक",
    pharmacy: "फार्मेसी",
    lab: "प्रयोगशाला",
    floor: "मंज़िल",
    near: "के पास",
    opposite: "के सामने",
  },
  ar: {
    street: "شارع",
    road: "طريق",
    lane: "زقاق",
    market: "سوق",
    hospital: "مستشفى",
    clinic: "عيادة",
    pharmacy: "صيدلية",
    lab: "مختبر",
    floor: "طابق",
    near: "بالقرب",
    opposite: "مقابل",
  },
  it: {
    street: "Strada",
    road: "Via",
    lane: "Vicolo",
    market: "Mercato",
    hospital: "Ospedale",
    clinic: "Clinica",
    pharmacy: "Farmacia",
    lab: "Laboratorio",
    floor: "Piano",
    near: "Vicino",
    opposite: "Di fronte",
  },
  es: {
    street: "Calle",
    road: "Carretera",
    lane: "Callejón",
    market: "Mercado",
    hospital: "Hospital",
    clinic: "Clínica",
    pharmacy: "Farmacia",
    lab: "Laboratorio",
    floor: "Piso",
    near: "Cerca",
    opposite: "Frente a",
  },
  zh: {
    street: "街",
    road: "路",
    lane: "巷",
    market: "市场",
    hospital: "医院",
    clinic: "诊所",
    pharmacy: "药房",
    lab: "实验室",
    floor: "楼层",
    near: "附近",
    opposite: "对面",
  },
};

export function translateAddressGenericWords(address: string, lang: string): { text: string; method: Method } {
  if (!address || !DICT[lang]) return { text: address, method: "none" };
  const dict = DICT[lang];
  let out = address;
  const SAFE = /"[^\"]+"|'[^']+'|[A-Z]{2,}[A-Z0-9\-]*|[A-Z][a-z]+[A-Z][a-z]+/g;
  const protectedSpans = new Set<string>((out.match(SAFE) ?? []));
  const replaceWord = (word: string, translated: string) => {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    out = out.replace(re, (match) => (protectedSpans.has(match) ? match : preserveCase(match, translated)));
  };
  Object.entries(dict).forEach(([key, value]) => replaceWord(key, value));
  return { text: out, method: "translate" };
}

function preserveCase(sample: string, translated: string) {
  if (sample.toUpperCase() === sample) return translated;
  if (sample[0] === sample[0]?.toUpperCase()) return translated;
  return translated.toLowerCase();
}
