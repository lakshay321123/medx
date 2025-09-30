import { NextResponse } from "next/server";
import { providerLang } from "@/lib/i18n/providerLang";

// meters per degree latitude (simple distance estimate)
const M_PER_DEG = 111_320;

function flagEnabled(value: string | undefined, defaultValue: boolean) {
  if (value == null) return defaultValue;
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

const DIRECTORY_NAME_I18N_ENABLED = flagEnabled(
  process.env.DIRECTORY_NAME_I18N ?? process.env.NEXT_PUBLIC_DIRECTORY_NAME_I18N,
  true,
);
const DIRECTORY_ADDRESS_I18N_ENABLED = flagEnabled(
  process.env.DIRECTORY_ADDRESS_I18N ?? process.env.NEXT_PUBLIC_DIRECTORY_ADDRESS_I18N,
  false,
);
const NAME_CACHE_TTL_SECONDS = 86_400;
const NAME_CACHE_TTL_MS = NAME_CACHE_TTL_SECONDS * 1000;
const DETAILS_CACHE_TTL_MS = 86_400 * 1000;

type NameLocalization = {
  name_original: string;
  name_localized: string;
  name_method: "provider" | "translate" | "transliterate" | "fallback";
  name_display: string;
  name_cache_ttl: number;
};

type DirectoryCaches = {
  __dirCache?: Map<string, { data: Place[]; updatedAt: string; provider: "google" | "osm" }>;
  __dirNameCache?: Map<string, { entry: NameLocalization; expiresAt: number }>;
  __dirDetailsCache?: Map<string, { entry: GoogleDetails; expiresAt: number }>;
};

const GENERIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    "medical center": "मेडिकल सेंटर",
    "medical centre": "मेडिकल सेंटर",
    "medical centers": "मेडिकल सेंटर्स",
    "medical centres": "मेडिकल सेंटर्स",
    center: "केंद्र",
    centre: "केंद्र",
    centers: "केंद्र",
    centres: "केंद्र",
    multispeciality: "बहु-विशेषता",
    multispecialty: "बहु-विशेषता",
    maternity: "मातृत्व",
    physiotherapy: "फिजियोथेरेपी",
    ent: "ईएनटी",
    dermatology: "त्वचा रोग",
    pediatric: "बाल चिकित्सा",
    pediatrics: "बाल चिकित्सा",
    paediatric: "बाल चिकित्सा",
    paediatrics: "बाल चिकित्सा",
    orthopedic: "अस्थि रोग",
    orthopaedic: "अस्थि रोग",
    orthopedics: "अस्थि रोग",
    orthopaedics: "अस्थि रोग",
    gynecology: "स्त्री रोग",
    gynaecology: "स्त्री रोग",
    cardiac: "हृदय",
    dental: "दंत",
    eye: "नेत्र",
    diagnostic: "डायग्नोस्टिक",
    diagnostics: "डायग्नोस्टिक्स",
    labs: "लैब्स",
    lab: "लैब",
    clinics: "क्लिनिक",
    clinic: "क्लिनिक",
    hospitals: "अस्पताल",
    hospital: "अस्पताल",
    pharmacies: "फार्मेसियाँ",
    pharmacy: "फार्मेसी",
    doctors: "डॉक्टर",
    doctor: "डॉक्टर",
  },
  ar: {
    "medical center": "مركز طبي",
    "medical centre": "مركز طبي",
    "medical centers": "مراكز طبية",
    "medical centres": "مراكز طبية",
    center: "مركز",
    centre: "مركز",
    centers: "مراكز",
    centres: "مراكز",
    multispeciality: "متعدد التخصصات",
    multispecialty: "متعدد التخصصات",
    maternity: "أمومة",
    physiotherapy: "علاج طبيعي",
    ent: "أنف وأذن وحنجرة",
    dermatology: "جلدية",
    pediatric: "أطفال",
    pediatrics: "أطفال",
    paediatric: "أطفال",
    paediatrics: "أطفال",
    orthopedic: "عظام",
    orthopaedic: "عظام",
    orthopedics: "عظام",
    orthopaedics: "عظام",
    gynecology: "نسائية",
    gynaecology: "نسائية",
    cardiac: "قلبي",
    dental: "أسنان",
    eye: "عيون",
    diagnostic: "تشخيصي",
    diagnostics: "تشخيص",
    labs: "مختبرات",
    lab: "مختبر",
    clinics: "عيادات",
    clinic: "عيادة",
    hospitals: "مستشفيات",
    hospital: "مستشفى",
    pharmacies: "صيدليات",
    pharmacy: "صيدلية",
    doctors: "أطباء",
    doctor: "طبيب",
  },
  it: {
    "medical center": "Centro Medico",
    "medical centre": "Centro Medico",
    "medical centers": "Centri Medici",
    "medical centres": "Centri Medici",
    center: "Centro",
    centre: "Centro",
    centers: "Centri",
    centres: "Centri",
    multispeciality: "Polispecialistica",
    multispecialty: "Polispecialistica",
    maternity: "Maternità",
    physiotherapy: "Fisioterapia",
    ent: "Otorinolaringoiatria",
    dermatology: "Dermatologia",
    pediatric: "Pediatria",
    pediatrics: "Pediatria",
    paediatric: "Pediatria",
    paediatrics: "Pediatria",
    orthopedic: "Ortopedia",
    orthopaedic: "Ortopedia",
    orthopedics: "Ortopedia",
    orthopaedics: "Ortopedia",
    gynecology: "Gynecologia",
    gynaecology: "Gynecologia",
    cardiac: "Cardiologia",
    dental: "Odontoiatria",
    eye: "Oculistica",
    diagnostic: "Diagnostico",
    diagnostics: "Diagnostica",
    labs: "Laboratori",
    lab: "Laboratorio",
    clinics: "Cliniche",
    clinic: "Clinica",
    hospitals: "Ospedali",
    hospital: "Ospedale",
    pharmacies: "Farmacie",
    pharmacy: "Farmacia",
    doctors: "Medici",
    doctor: "Medico",
  },
  es: {
    "medical center": "Centro Médico",
    "medical centre": "Centro Médico",
    "medical centers": "Centros Médicos",
    "medical centres": "Centros Médicos",
    center: "Centro",
    centre: "Centro",
    centers: "Centros",
    centres: "Centros",
    multispeciality: "Multiespecialidad",
    multispecialty: "Multiespecialidad",
    maternity: "Maternidad",
    physiotherapy: "Fisioterapia",
    ent: "Otorrinolaringología",
    dermatology: "Dermatología",
    pediatric: "Pediatría",
    pediatrics: "Pediatría",
    paediatric: "Pediatría",
    paediatrics: "Pediatría",
    orthopedic: "Ortopedia",
    orthopaedic: "Ortopedia",
    orthopedics: "Ortopedia",
    orthopaedics: "Ortopedia",
    gynecology: "Ginecología",
    gynaecology: "Ginecología",
    cardiac: "Cardiología",
    dental: "Dental",
    eye: "Oftalmología",
    diagnostic: "Diagnóstico",
    diagnostics: "Diagnósticos",
    labs: "Laboratorios",
    lab: "Laboratorio",
    clinics: "Clínicas",
    clinic: "Clínica",
    hospitals: "Hospitales",
    hospital: "Hospital",
    pharmacies: "Farmacias",
    pharmacy: "Farmacia",
    doctors: "Doctores",
    doctor: "Doctor",
  },
  fr: {
    "medical center": "Centre médical",
    "medical centre": "Centre médical",
    "medical centers": "Centres médicaux",
    "medical centres": "Centres médicaux",
    center: "Centre",
    centre: "Centre",
    centers: "Centres",
    centres: "Centres",
    multispeciality: "Pluridisciplinaire",
    multispecialty: "Pluridisciplinaire",
    maternity: "Maternité",
    physiotherapy: "Kinésithérapie",
    ent: "ORL",
    dermatology: "Dermatologie",
    pediatric: "Pédiatrie",
    pediatrics: "Pédiatrie",
    paediatric: "Pédiatrie",
    paediatrics: "Pédiatrie",
    orthopedic: "Orthopédie",
    orthopaedic: "Orthopédie",
    orthopedics: "Orthopédie",
    orthopaedics: "Orthopédie",
    gynecology: "Gynécologie",
    gynaecology: "Gynécologie",
    cardiac: "Cardiologie",
    dental: "Dentaire",
    eye: "Ophtalmologie",
    diagnostic: "Diagnostic",
    diagnostics: "Diagnostics",
    labs: "Laboratoires",
    lab: "Laboratoire",
    clinics: "Cliniques",
    clinic: "Clinique",
    hospitals: "Hôpitaux",
    hospital: "Hôpital",
    pharmacies: "Pharmacies",
    pharmacy: "Pharmacie",
    doctors: "Médecins",
    doctor: "Médecin",
  },
  zh: {
    "medical center": "医疗中心",
    "medical centre": "医疗中心",
    "medical centers": "医疗中心",
    "medical centres": "医疗中心",
    center: "中心",
    centre: "中心",
    centers: "中心",
    centres: "中心",
    multispeciality: "多专科",
    multispecialty: "多专科",
    maternity: "产科",
    physiotherapy: "物理治疗",
    ent: "耳鼻喉科",
    dermatology: "皮肤科",
    pediatric: "儿科",
    pediatrics: "儿科",
    paediatric: "儿科",
    paediatrics: "儿科",
    orthopedic: "骨科",
    orthopaedic: "骨科",
    orthopedics: "骨科",
    orthopaedics: "骨科",
    gynecology: "妇科",
    gynaecology: "妇科",
    cardiac: "心脏科",
    dental: "牙科",
    eye: "眼科",
    diagnostic: "诊断",
    diagnostics: "诊断",
    labs: "实验室",
    lab: "实验室",
    clinics: "诊所",
    clinic: "诊所",
    hospitals: "医院",
    hospital: "医院",
    pharmacies: "药店",
    pharmacy: "药店",
    doctors: "医生",
    doctor: "医生",
  },
};

const ABBREVIATION_TRANSLATIONS: Record<string, { pattern: RegExp; replacement: string }> = {
  hi: { pattern: /\bDr\.?/gi, replacement: "डा." },
  ar: { pattern: /\bDr\.?/gi, replacement: "د." },
  it: { pattern: /\bDr\.?/gi, replacement: "Dott.ssa" },
  es: { pattern: /\bDr\.?/gi, replacement: "Dr." },
  fr: { pattern: /\bDr\.?/gi, replacement: "Dr" },
  zh: { pattern: /\bDr\.?/gi, replacement: "医生" },
};

const DEVANAGARI_MAP: Record<string, string> = {
  a: "अ",
  b: "ब",
  c: "क",
  d: "द",
  e: "ए",
  f: "फ",
  g: "ग",
  h: "ह",
  i: "इ",
  j: "ज",
  k: "क",
  l: "ल",
  m: "म",
  n: "न",
  o: "ओ",
  p: "प",
  q: "क",
  r: "र",
  s: "स",
  t: "ट",
  u: "उ",
  v: "व",
  w: "व",
  x: "क्स",
  y: "य",
  z: "ज़",
};

const ARABIC_MAP: Record<string, string> = {
  a: "ا",
  b: "ب",
  c: "ك",
  d: "د",
  e: "ي",
  f: "ف",
  g: "ج",
  h: "ه",
  i: "ي",
  j: "ج",
  k: "ك",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "ب",
  q: "ق",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "ف",
  w: "و",
  x: "كس",
  y: "ي",
  z: "ز",
};

function resolveLangMap<T>(table: Record<string, T>, lang: string): T | undefined {
  const normalized = lang.toLowerCase();
  if (table[normalized]) return table[normalized];
  const base = normalized.split("-")[0];
  return table[base];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preserveCase(sample: string, localized: string) {
  if (!sample) return localized;
  if (sample === sample.toUpperCase()) return localized.toUpperCase();
  if (sample === sample.toLowerCase()) return localized.toLowerCase();
  if (sample[0] === sample[0].toUpperCase()) {
    return localized.charAt(0).toUpperCase() + localized.slice(1);
  }
  return localized;
}

function translateGenericTerms(name: string, lang: string) {
  const map = resolveLangMap(GENERIC_TRANSLATIONS, lang);
  if (!map) return { text: name, changed: false };

  let text = name;
  let changed = false;
  const terms = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const term of terms) {
    const localized = map[term];
    const pattern = escapeRegExp(term);
    const possessive = new RegExp(`([\\p{L}\\p{M}0-9]+)[’']s\\s+${pattern}(?=\\b)`, "giu");
    text = text.replace(possessive, (_, owner: string) => {
      changed = true;
      return `${localized} ${owner}`;
    });

    const regex = new RegExp(`\\b${pattern}\\b`, "gi");
    text = text.replace(regex, (match: string) => {
      changed = true;
      return preserveCase(match, localized);
    });
  }

  const abbr = resolveLangMap(ABBREVIATION_TRANSLATIONS, lang);
  if (abbr) {
    const { pattern, replacement } = abbr;
    const regex = new RegExp(pattern.source, pattern.flags);
    const updated = text.replace(regex, replacement);
    if (updated !== text) {
      text = updated;
      changed = true;
    }
  }

  return { text, changed };
}

function transliterate(name: string, lang: string) {
  const asciiOnly = /^[\p{ASCII}]*$/u.test(name);
  if (!asciiOnly) return null;
  if (!/[A-Za-z]/.test(name)) return null;
  const lowerLang = lang.toLowerCase();
  if (lowerLang.startsWith("hi")) {
    return name
      .split("")
      .map((char) => {
        const lower = char.toLowerCase();
        const mapped = DEVANAGARI_MAP[lower];
        return mapped ? mapped : char;
      })
      .join("");
  }
  if (lowerLang.startsWith("ar")) {
    return name
      .split("")
      .map((char) => {
        const lower = char.toLowerCase();
        const mapped = ARABIC_MAP[lower];
        return mapped ? mapped : char;
      })
      .join("");
  }
  return null;
}

function localizeName(place: Place, lang: string, caches: DirectoryCaches): NameLocalization {
  const nameOriginal = place.name || "";
  const cacheKey = `${place.id}|${lang}`;
  const now = Date.now();
  caches.__dirNameCache ||= new Map();
  const cached = caches.__dirNameCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.entry;
  }

  let nameLocalized = nameOriginal;
  let method: NameLocalization["name_method"] = "fallback";

  const providerName = place.localizedName && place.localizedName.trim().length ? place.localizedName : undefined;
  if (providerName && providerName !== nameOriginal) {
    nameLocalized = providerName;
    method = "provider";
  } else {
    const translated = translateGenericTerms(nameOriginal, lang);
    if (translated.changed && translated.text.trim().length) {
      nameLocalized = translated.text.trim();
      method = "translate";
    } else {
      const transliterated = transliterate(nameOriginal, lang);
      if (transliterated && transliterated !== nameOriginal) {
        nameLocalized = transliterated;
        method = "transliterate";
      }
    }
  }

  const nameDisplay = nameLocalized !== nameOriginal ? `${nameLocalized} (${nameOriginal})` : nameOriginal;
  const entry: NameLocalization = {
    name_original: nameOriginal,
    name_localized: nameLocalized,
    name_method: method,
    name_display: nameDisplay,
    name_cache_ttl: NAME_CACHE_TTL_SECONDS,
  };

  caches.__dirNameCache.set(cacheKey, { entry, expiresAt: now + NAME_CACHE_TTL_MS });
  return entry;
}

type Place = {
  id: string;
  name: string;
  address?: string;
  localizedName?: string;
  localizedAddress?: string;
  name_original?: string;
  name_localized?: string;
  name_method?: "provider" | "translate" | "transliterate" | "fallback";
  name_display?: string;
  name_cache_ttl?: number;
  type: "doctor" | "pharmacy" | "lab" | "hospital" | "clinic";
  category_display?: string;
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  distance_m?: number;
  open_now?: boolean;
  hours?: Record<string, string>;
  phones?: string[];
  whatsapp?: string | null;
  geo: { lat: number; lng: number };
  amenities?: string[];
  services?: string[];
  images?: string[];
  source: "google" | "osm";
  source_ref?: string;
  last_checked?: string;
  rank_score?: number;
};

function stripNameFields(place: Place & Partial<NameLocalization>): Place {
  const { name_display, name_localized, name_original, name_method, name_cache_ttl, ...rest } = place;
  return rest as Place;
}

function applyDirectoryFeatures(places: Place[], lang: string, caches: DirectoryCaches) {
  return places.map(place => {
    const base = place as Place & Partial<NameLocalization>;
    let next: Place & Partial<NameLocalization> = { ...base };

    if (DIRECTORY_ADDRESS_I18N_ENABLED) {
      const localized = base.localizedAddress;
      const fallback = base.address;
      const resolved = localized ?? fallback ?? "";
      next = { ...next, address: resolved };
      if ("localizedAddress" in next) {
        delete (next as Record<string, unknown>).localizedAddress;
      }
    }

    if (DIRECTORY_NAME_I18N_ENABLED) {
      const localizedName = localizeName(base, lang, caches);
      next = { ...next, ...localizedName };
    } else {
      delete (next as Record<string, unknown>).name_display;
      delete (next as Record<string, unknown>).name_localized;
      delete (next as Record<string, unknown>).name_original;
      delete (next as Record<string, unknown>).name_method;
      delete (next as Record<string, unknown>).name_cache_ttl;
    }

    return next;
  });
}

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function composeAddress(components: GoogleAddressComponent[], appLang: string) {
  const lang = providerLang(appLang);
  const by = (t: string) =>
    components.find(c => Array.isArray(c.types) && c.types.includes(t));

  const street = [by("street_number")?.longText, by("route")?.longText]
    .filter(Boolean)
    .join(" ");
  const sublocality = by("sublocality")?.longText ?? by("sublocality_level_1")?.longText;
  const locality = by("locality")?.longText ?? by("postal_town")?.longText;
  const admin2 = by("administrative_area_level_2")?.longText;
  const admin1 = by("administrative_area_level_1")?.longText;
  const postal = by("postal_code")?.longText;
  const countryCode = by("country")?.shortText;

  const country = countryCode
    ? new Intl.DisplayNames(lang, { type: "region" }).of(countryCode)
    : undefined;

  return [street, sublocality, locality, admin2, admin1, postal, country]
    .filter(Boolean)
    .join(", ");
}

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dx = (b.lng - a.lng) * (Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180) * M_PER_DEG);
  const dy = (b.lat - a.lat) * M_PER_DEG;
  return Math.sqrt(dx * dx + dy * dy);
}

function mapUiTypeToGoogle(uiType: string) {
  // Prefer Google official "type" when possible, otherwise keyword.
  // doctor and pharmacy and hospital are official; clinic and lab are spotty.
  // We will pass "type" where supported and "keyword" to widen matches.
  const t = uiType.toLowerCase();
  switch (t) {
    case "doctor":
      return { gType: "doctor", keyword: "doctor health clinic" };
    case "pharmacy":
      return { gType: "pharmacy", keyword: "pharmacy chemist medical store" };
    case "hospital":
      return { gType: "hospital", keyword: "hospital" };
    case "clinic":
      return { gType: undefined, keyword: "clinic health doctor polyclinic" };
    case "lab":
      return { gType: undefined, keyword: "medical laboratory diagnostic lab pathology" };
    case "all":
    default:
      return { gType: undefined, keyword: "doctor pharmacy hospital clinic health medical laboratory" };
  }
}

function normalizeHoursRows(rows: string[] | undefined): Record<string, string> | undefined {
  if (!rows || !Array.isArray(rows)) return undefined;
  const out: Record<string, string> = {};
  rows.forEach((r: string) => {
    const idx = r.indexOf(":");
    if (idx > 0) {
      const day = r.slice(0, idx).toLowerCase(); // "monday"
      out[day] = r.slice(idx + 1).trim();
    }
  });
  return Object.keys(out).length ? out : undefined;
}

function normDetailsHours(opening: any): Record<string, string> | undefined {
  // Google returns weekday_text like ["Monday: 9 AM–9 PM", "Tuesday: 9 AM–9 PM"]
  const rows: string[] | undefined = opening?.weekday_text;
  return normalizeHoursRows(rows);
}

function normDetailsHoursV1(opening: any): Record<string, string> | undefined {
  const rows: string[] | undefined = opening?.weekdayDescriptions;
  return normalizeHoursRows(rows);
}

async function googleNearby({
  lat,
  lng,
  radius,
  uiType,
  q,
  key,
  lang,
}: {
  lat: number;
  lng: number;
  radius: number;
  uiType: string;
  q: string;
  key: string;
  lang: string;
}) {
  const { gType, keyword } = mapUiTypeToGoogle(uiType);
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(Math.min(radius, 20000))); // Google max 50km, we cap to 20km
  if (gType) url.searchParams.set("type", gType);
  const kw = [keyword, q].filter(Boolean).join(" ");
  if (kw) url.searchParams.set("keyword", kw);
  url.searchParams.set("key", key);
  url.searchParams.set("language", lang);

  const resp = await fetch(url.toString(), { cache: "no-store" });
  if (!resp.ok) throw new Error("google nearby failed");
  const j = await resp.json();
  return j?.results ?? [];
}

function humanizeGoogleType(type?: string | null) {
  if (!type) return undefined;
  const map: Record<string, string> = {
    doctor: "Doctor",
    pharmacy: "Pharmacy",
    hospital: "Hospital",
    clinic: "Clinic",
    medical_lab: "Medical Lab",
    health: "Health",
  };
  const lower = type.toLowerCase();
  if (map[lower]) return map[lower];
  return lower
    .split("_")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type GoogleDetails = {
  phone?: string;
  hours?: Record<string, string>;
  formattedAddress?: string;
  displayNameText?: string;
  primaryTypeDisplayNameText?: string;
  addressComponents?: GoogleAddressComponent[];
  composedAddress?: string;
};

async function googlePlaceDetailsV1(placeId: string, key: string, lang: string): Promise<GoogleDetails> {
  const fields = [
    "displayName",
    "primaryTypeDisplayName",
    "formattedAddress",
    "addressComponents",
    "internationalPhoneNumber",
    "regularOpeningHours",
  ].join(",");
  const endpoint = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  endpoint.searchParams.set("languageCode", lang);
  const res = await fetch(endpoint, {
    headers: {
      "X-Goog-Api-Key": key,
      "Accept-Language": lang,
      "X-Goog-FieldMask": fields,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("google v1 details failed");
  }
  const j = await res.json();
  return {
    phone: j?.internationalPhoneNumber ?? undefined,
    hours: normDetailsHoursV1(j?.regularOpeningHours),
    formattedAddress: j?.formattedAddress ?? undefined,
    displayNameText: j?.displayName?.text ?? undefined,
    primaryTypeDisplayNameText: j?.primaryTypeDisplayName?.text ?? undefined,
    addressComponents: Array.isArray(j?.addressComponents) ? j.addressComponents : undefined,
  };
}

async function googleLegacyDetails(placeId: string, key: string, lang: string): Promise<GoogleDetails> {
  const fields = [
    "formatted_phone_number",
    "international_phone_number",
    "opening_hours",
    "formatted_address",
    "name",
    "types",
  ].join(",");
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", key);
  url.searchParams.set("language", lang);
  const r = await fetch(url.toString(), { cache: "no-store" });
  if (!r.ok) {
    throw new Error("google legacy details failed");
  }
  const j = await r.json();
  const d = j?.result;
  const phone = d?.international_phone_number || d?.formatted_phone_number;
  const formattedAddress = d?.formatted_address ?? d?.vicinity ?? undefined;
  const rawTypes = Array.isArray(d?.types) ? d.types : [];
  return {
    phone: phone ?? undefined,
    hours: normDetailsHours(d?.opening_hours),
    formattedAddress,
    displayNameText: d?.name ?? undefined,
    primaryTypeDisplayNameText: humanizeGoogleType(rawTypes[0]) ?? undefined,
  };
}

async function googleDetailsBatch(
  placeIds: string[],
  key: string,
  lang: string,
  appLang: string,
  caches: DirectoryCaches,
) {
  // Enrich top N results for phone and opening hours.
  // We limit N to 12 to keep latency and quota sane.
  const N = Math.min(placeIds.length, 12);
  const out = new Map<string, GoogleDetails>();
  caches.__dirDetailsCache ||= new Map();
  const cache = caches.__dirDetailsCache;
  const langKey = lang.toLowerCase();

  for (let i = 0; i < N; i++) {
    const id = placeIds[i];
    const cacheKey = `${id}|${langKey}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      const entry = { ...cached.entry };
      if (entry.addressComponents?.length) {
        entry.composedAddress = composeAddress(entry.addressComponents, appLang);
      }
      out.set(id, entry);
      continue;
    }
    try {
      const v1 = await googlePlaceDetailsV1(id, key, lang);
      const base: GoogleDetails = { ...v1 };
      if (base.addressComponents?.length) {
        base.composedAddress = composeAddress(base.addressComponents, appLang);
      }
      out.set(id, base);
      cache.set(cacheKey, { entry: { ...base, composedAddress: undefined }, expiresAt: Date.now() + DETAILS_CACHE_TTL_MS });
    } catch (v1Error) {
      try {
        const legacy = await googleLegacyDetails(id, key, lang);
        const base: GoogleDetails = { ...legacy, composedAddress: legacy.formattedAddress };
        out.set(id, base);
        cache.set(cacheKey, { entry: { ...base, composedAddress: undefined }, expiresAt: Date.now() + DETAILS_CACHE_TTL_MS });
      } catch {
        // ignore errors for individual details calls
      }
    }
  }
  return out;
}

function normalizeGoogleResults(
  results: any[],
  origin: { lat: number; lng: number },
  uiType: string,
): Place[] {
  const now = new Date().toISOString();
  return results
    .map((r: any) => {
      const loc = r?.geometry?.location;
      if (!loc) return null;
      const structuredName = r?.structured_formatting?.main_text;
      const rawName =
        typeof r?.name === "string" && !r.name.startsWith("ChIJ") ? r.name : undefined;
      const fallbackName =
        rawName ??
        structuredName ??
        r?.displayName?.text ??
        r?.vicinity ??
        r?.plus_code?.compound_code ??
        "Unnamed";
      const canonicalName = rawName ?? structuredName ?? fallbackName;
      const localizedName =
        typeof r?.displayName?.text === "string" ? r.displayName.text : undefined;
      const localizedAddressCandidate =
        r?.formattedAddress ?? r?.formatted_address ?? undefined;
      const canonicalAddress = r?.vicinity ?? r?.plus_code?.compound_code ?? undefined;
      const address = canonicalAddress ?? localizedAddressCandidate ?? undefined;
      const localizedAddress =
        localizedAddressCandidate && localizedAddressCandidate !== address
          ? localizedAddressCandidate
          : undefined;
      const primaryTypeDisplayName =
        r?.primaryTypeDisplayName?.text ??
        r?.primary_type_display_name ??
        humanizeGoogleType(Array.isArray(r?.types) ? r.types[0] : undefined);
      const p: Place = {
        id: r.place_id,
        name: canonicalName,
        address,
        localizedName: localizedName && localizedName !== canonicalName ? localizedName : undefined,
        localizedAddress,
        type: (uiType === "all" ? inferTypeFromGoogle(r.types || []) : (uiType as Place["type"])) || "clinic",
        rating: r.rating,
        reviews_count: r.user_ratings_total,
        price_level: r.price_level,
        distance_m: Math.round(distMeters(origin, { lat: loc.lat, lng: loc.lng })),
        open_now: r.opening_hours?.open_now,
        geo: { lat: loc.lat, lng: loc.lng },
        amenities: [],
        services: [],
        images: [],
        source: "google",
        source_ref: r.place_id,
        last_checked: now,
      };
      if (primaryTypeDisplayName) {
        p.category_display = primaryTypeDisplayName;
      }
      return p;
    })
    .filter(Boolean) as Place[];
}

function inferTypeFromGoogle(types: string[]): Place["type"] {
  // order matters
  if (types.includes("pharmacy")) return "pharmacy";
  if (types.includes("hospital")) return "hospital";
  if (types.includes("doctor")) return "doctor";
  if (types.includes("health")) return "clinic";
  if (types.includes("medical_lab")) return "lab";
  return "clinic";
}

function uniqueByNameAddr(list: Place[]) {
  const key = (p: Place) => `${(p.name || "").toLowerCase()}|${(p.address || "").toLowerCase()}`;
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of list) {
    const k = key(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

// OSM fallback if Google unavailable or empty
async function osmFallback(
  lat: number,
  lng: number,
  radius: number,
  uiType: string,
  lang: string,
) {
  function kindFilters(type: string) {
    switch (type) {
      case "pharmacy":
        return ['["amenity"="pharmacy"]'];
      case "doctor":
        return ['["amenity"="doctors"]', '["healthcare"="doctor"]'];
      case "lab":
        return ['["healthcare"="laboratory"]', '["amenity"="laboratory"]'];
      case "hospital":
        return ['["amenity"="hospital"]', '["healthcare"="hospital"]'];
      case "clinic":
        return ['["amenity"="clinic"]', '["healthcare"="clinic"]'];
      case "all":
      default:
        return [
          '["amenity"="pharmacy"]',
          '["amenity"="doctors"]',
          '["healthcare"="doctor"]',
          '["healthcare"="laboratory"]',
          '["amenity"="laboratory"]',
          '["amenity"="hospital"]',
          '["healthcare"="hospital"]',
          '["amenity"="clinic"]',
          '["healthcare"="clinic"]',
        ];
    }
  }
  function buildOverpassQL(kinds: string[]) {
    const selectors = kinds.map(k => `
      node(around:${radius},${lat},${lng})${k};
      way(around:${radius},${lat},${lng})${k};
      relation(around:${radius},${lat},${lng})${k};
    `).join("\n");
    return `[out:json][timeout:25];
      (${selectors});
      out tags center 200;`;
  }
  const body = buildOverpassQL(kindFilters(uiType));
  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "User-Agent": "SecondOpinion/1.0 (directory search) support@secondopinion.local",
      "Accept-Language": lang,
    },
    body,
  });
  if (!r.ok) return [];
  const j = await r.json();
  const origin = { lat, lng };
  const now = new Date().toISOString();
  const langLower = lang.toLowerCase();
  const langBase = langLower.split("-")[0] || langLower;
  const langCandidates = Array.from(new Set([langLower, langBase].filter(Boolean)));
  const res: Place[] = (j.elements || []).map((el: any) => {
    const center = el.center || { lat: el.lat, lon: el.lon };
    const namedetails = el?.namedetails ?? {};
    const localizedNameCandidate = langCandidates
      .map(code => namedetails?.[`name:${code}`] ?? el?.tags?.[`name:${code}`])
      .find(Boolean);
    const fallbackName =
      namedetails?.name ||
      el?.tags?.name ||
      el?.tags?.["addr:housename"] ||
      el?.tags?.["brand"];
    const providerName = localizedNameCandidate || el?.localname || fallbackName || "Unnamed";
    const name = fallbackName || providerName || "Unnamed";
    const localizedName =
      providerName && providerName !== name ? providerName : undefined;
    const localizedStreet = langCandidates
      .map(code => el?.tags?.[`addr:street:${code}`])
      .find(Boolean);
    const localizedNeighbourhood = langCandidates
      .map(code => el?.tags?.[`addr:neighbourhood:${code}`])
      .find(Boolean);
    const localizedCity = langCandidates
      .map(code => el?.tags?.[`addr:city:${code}`])
      .find(Boolean);
    const localizedFull = langCandidates
      .map(code => el?.tags?.[`addr:full:${code}`])
      .find(Boolean);
    const fallbackStreet = el?.tags?.["addr:street"];
    const fallbackNeighbourhood = el?.tags?.["addr:neighbourhood"];
    const fallbackCity = el?.tags?.["addr:city"];
    const fallbackFull = el?.tags?.["addr:full"];
    const canonicalParts = [
      el?.tags?.["addr:housenumber"],
      fallbackStreet,
      fallbackNeighbourhood,
      fallbackCity,
    ];
    const canonicalAddress = fallbackFull || canonicalParts.filter(Boolean).join(", ");
    const localizedFullCandidate = localizedFull || namedetails?.[`addr:full:${langLower}`];
    const localizedAddressCandidate =
      localizedFullCandidate ||
      [
        el?.tags?.["addr:housenumber"],
        localizedStreet || fallbackStreet,
        localizedNeighbourhood || fallbackNeighbourhood,
        localizedCity || fallbackCity,
      ]
        .filter(Boolean)
        .join(", ");
    const address = canonicalAddress || localizedAddressCandidate || undefined;
    const localizedAddress =
      localizedAddressCandidate && localizedAddressCandidate !== address ? localizedAddressCandidate : undefined;
    const p: Place = {
      id: String(el.id),
      name,
      address,
      localizedName,
      localizedAddress,
      type: "clinic",
      distance_m: Math.round(distMeters(origin, { lat: center.lat, lng: center.lon })),
      geo: { lat: center.lat, lng: center.lon },
      source: "osm",
      source_ref: String(el.id),
      last_checked: now,
    };
    return p;
  });
  res.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
  return res;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = Math.min(parseInt(searchParams.get("radius") || "5000", 10), 20000);
  const uiType = (searchParams.get("type") || "all").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const maxKm = parseFloat(searchParams.get("max_km") || "");
  const minRating = parseFloat(searchParams.get("min_rating") || "");
  const openNow = searchParams.get("open_now") === "1";
  const appLang = (searchParams.get("lang") || "en").trim() || "en";
  const lang = providerLang(appLang);
  const cacheKey = [
    "dir",
    q,
    searchParams.get("lat") ?? "",
    searchParams.get("lng") ?? "",
    searchParams.get("radius") ?? "",
    lang,
  ].join("|");
  const globalAny = globalThis as typeof globalThis & DirectoryCaches;
  globalAny.__dirCache ||= new Map();
  const cache = globalAny.__dirCache;

  const cached = cache.get(cacheKey);
  if (cached) {
    const enriched = applyDirectoryFeatures(cached.data, lang, globalAny);
    return NextResponse.json({ ...cached, data: enriched });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const origin = { lat, lng };
  const key = process.env.GOOGLE_PLACES_API_KEY;

  let places: Place[] = [];
  let usedGoogle = false;

  if (key) {
    try {
      const results = await googleNearby({ lat, lng, radius, uiType, q, key, lang });
      let normalized = normalizeGoogleResults(results, origin, uiType);

      // optional post filter by rating
      if (Number.isFinite(minRating)) {
        normalized = normalized.filter(p => (p.rating ?? 5) >= minRating);
      }
      if (Number.isFinite(maxKm)) {
        normalized = normalized.filter(p => (p.distance_m ?? 1e9) <= maxKm * 1000);
      }
      if (openNow) {
        normalized = normalized.filter(p => p.open_now !== false);
      }

      // enrich top items with phone and hours
      const ids = normalized.map(p => p.id);
      const details = await googleDetailsBatch(ids, key, lang, appLang, globalAny);
      for (const p of normalized) {
        const d = details.get(p.id);
        if (d?.phone) p.phones = [d.phone];
        if (d?.hours) p.hours = d.hours;
        const formattedAddress = d?.formattedAddress ?? d?.composedAddress;
        if (formattedAddress) {
          if (!p.address) {
            p.address = formattedAddress;
          } else if (p.address !== formattedAddress) {
            p.localizedAddress = formattedAddress;
          }
        }
        if (d?.primaryTypeDisplayNameText) {
          p.category_display = d.primaryTypeDisplayNameText;
        }
        if (d?.displayNameText) {
          const providerName = d.displayNameText;
          if (!p.name) {
            p.name = providerName;
          } else if (p.name !== providerName) {
            p.localizedName = providerName;
          }
        }
      }

      normalized.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
      places = uniqueByNameAddr(normalized).slice(0, 120);
      usedGoogle = places.length > 0;
    } catch {
      // fall through to OSM
    }
  }

  if (!usedGoogle) {
    const osm = await osmFallback(lat, lng, radius, uiType, lang);
    let filtered = osm;
    if (Number.isFinite(maxKm)) filtered = filtered.filter(p => (p.distance_m ?? 1e9) <= maxKm * 1000);
    filtered.sort((a, b) => (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9));
    places = filtered.slice(0, 120);
  }

  const responsePlaces = applyDirectoryFeatures(places, lang, globalAny);
  const updatedAtIso = new Date().toISOString();
  const provider = usedGoogle ? "google" : "osm";

  const payload = {
    data: responsePlaces,
    updatedAt: updatedAtIso,
    provider,
  } as const;

  cache.set(cacheKey, {
    data: places.map(stripNameFields),
    updatedAt: updatedAtIso,
    provider,
  });

  return NextResponse.json(payload);
}
