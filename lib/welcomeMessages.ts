export type AppMode = "wellness" | "therapy" | "clinical" | "aidoc";

export type WelcomeMessage = {
  header: string;
  body: string;
  status?: string;
};

type WelcomeMessageConfig = {
  header: string;
  body: string;
};

const WELLNESS_MESSAGES: WelcomeMessageConfig[] = [
  {
    header: "Wellness Mode: ON",
    body: "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.",
  },
  {
    header: "Wellness Mode: ON",
    body: "Everything health, without the jargon. From lab reports to daily habits—meds, diet, fitness—made easy to act on.",
  },
  {
    header: "Wellness Mode: ON",
    body: "Clarity for everyday care. Reports, guidance, medication, diet, and fitness—understood at a glance.",
  },
  {
    header: "Wellness Mode: ON",
    body: "All your health, decoded. Reports, tips, meds, diet, and fitness—concise and actionable.",
  },
];

const CLINICAL_MESSAGES: WelcomeMessageConfig[] = [
  {
    header: "Clinical Mode: ON",
    body: "Clinical reasoning on demand. Built for doctors, nurses, and medical students.",
  },
  {
    header: "Clinical Mode: ON",
    body: "Depth when it matters. Structured differentials, red flags, and management—professional grade.",
  },
  {
    header: "Clinical Mode: ON",
    body: "Evidence-ready, clinician-first.",
  },
  {
    header: "Clinical Mode: ON",
    body: "Precision over prose. Concise clinical answers with clear next steps.",
  },
];

const THERAPY_MESSAGES: WelcomeMessageConfig[] = [
  {
    header: "Therapy Mode: ON",
    body: "Therapy guidance, made clear. Tools and support; not for emergencies.",
  },
  {
    header: "Therapy Mode: ON",
    body: "Calm, structured support. Practical techniques and next steps.",
  },
  {
    header: "Therapy Mode: ON",
    body: "Clarity for tough days. Grounded guidance, actionable exercises.",
  },
  {
    header: "Therapy Mode: ON",
    body: "Steady help, simple words. Skills you can use today.",
  },
];

const AIDOC_MESSAGES: WelcomeMessageConfig[] = [
  {
    header: "AI Doc: ON",
    body: "Your records, organized. Upload, store, and retrieve securely.",
  },
  {
    header: "AI Doc: ON",
    body: "All your reports in one place. Fast search, clear summaries.",
  },
  {
    header: "AI Doc: ON",
    body: "Medical files that make sense. Structured, searchable, shareable.",
  },
  {
    header: "AI Doc: ON",
    body: "From paper to clarity. Digitize reports; get clean overviews.",
  },
];

const CLINICAL_STATUS_INDEX = 2;

function cloneMessages(messages: WelcomeMessageConfig[]): WelcomeMessage[] {
  return messages.map(message => ({ ...message }));
}

function normalizeIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  const mod = index % total;
  return mod < 0 ? mod + total : mod;
}

function getStoredIndex(mode: AppMode, total: number): number | null {
  if (typeof window === "undefined" || total <= 0) return null;
  try {
    const stored = window.localStorage?.getItem(`welcome_pick_v2_${mode}`);
    if (stored === null) return null;
    const parsed = Number.parseInt(stored, 10);
    if (Number.isNaN(parsed)) return null;
    const normalized = normalizeIndex(parsed, total);
    if (normalized < 0 || normalized >= total) return null;
    return normalized;
  } catch {
    return null;
  }
}

function setStoredIndex(mode: AppMode, index: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(`welcome_pick_v2_${mode}`, String(index));
  } catch {
    /* ignore */
  }
}

function resolveSeed(mode: AppMode): number | null {
  if (typeof window === "undefined") return null;
  const candidates = [
    (window as any).__medxWelcomeSeed,
    (window as any).__medxWelcomeRotation,
    (window as any).__medxRotationSeed,
  ];
  for (const source of candidates) {
    if (source && typeof source === "object") {
      const value = source[mode];
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
      }
    }
  }
  return null;
}

export function getWelcomeOptions(
  mode: AppMode,
  opts: { researchOn?: boolean } = {},
): WelcomeMessage[] {
  switch (mode) {
    case "therapy":
      return cloneMessages(THERAPY_MESSAGES);
    case "clinical": {
      const base = cloneMessages(CLINICAL_MESSAGES);
      if (base[CLINICAL_STATUS_INDEX]) {
        base[CLINICAL_STATUS_INDEX] = {
          ...base[CLINICAL_STATUS_INDEX],
          status: opts.researchOn
            ? "Research: On — web evidence"
            : "Research: Off — enable web evidence",
        };
      }
      return base;
    }
    case "aidoc":
      return cloneMessages(AIDOC_MESSAGES);
    case "wellness":
    default:
      return cloneMessages(WELLNESS_MESSAGES);
  }
}

export function pickWelcome(
  mode: AppMode,
  opts: { researchOn?: boolean } = {},
): WelcomeMessage {
  const options = getWelcomeOptions(mode, opts);
  if (options.length === 0) {
    return { header: "", body: "" };
  }

  const seed = resolveSeed(mode);
  if (typeof seed === "number") {
    const index = normalizeIndex(seed, options.length);
    setStoredIndex(mode, index);
    return options[index];
  }

  const stored = getStoredIndex(mode, options.length);
  if (typeof stored === "number") {
    return options[stored];
  }

  const randomIndex = Math.floor(Math.random() * options.length);
  setStoredIndex(mode, randomIndex);
  return options[randomIndex];
}
