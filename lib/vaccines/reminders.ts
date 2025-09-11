const SCHEDULE_LINKS: Record<string, string> = {
  US: "https://www.cdc.gov/vaccines/schedules/index.html",
  UK: "https://www.nhs.uk/conditions/vaccinations/nhs-vaccination-schedule/",
  IN: "https://www.mohfw.gov.in/pdf/National_Immunization_Schedule.pdf",
};

const DEFAULT_LINK = "https://www.who.int/teams/immunization-vaccines-and-biologicals/diseases";

interface ScheduleItem {
  name: string;
  minAge: number;
  maxAge?: number;
  note: string;
}

const SCHEDULES: Record<string, ScheduleItem[]> = {
  US: [
    { name: "Td/Tdap", minAge: 11, note: "Booster every 10 years" },
    { name: "MMR", minAge: 1, maxAge: 7, note: "2 doses between 12-15 months and 4-6 years" },
    { name: "HPV", minAge: 11, maxAge: 27, note: "Recommended through age 26" },
    { name: "Influenza", minAge: 0.5, note: "Annual shot" },
    { name: "Shingles", minAge: 50, note: "2 doses for adults 50+" },
    { name: "Pneumococcal", minAge: 65, note: "Recommended for adults 65+" },
  ],
  DEFAULT: [
    { name: "Td/Tdap", minAge: 11, note: "Booster every 10 years" },
    { name: "Influenza", minAge: 0.5, note: "Annual shot" },
    { name: "MMR", minAge: 1, maxAge: 7, note: "2 doses between 12-15 months and 4-6 years" },
  ],
};

export interface ReminderParams {
  age: number;
  region: string;
  riskFlags?: string[];
  history?: string[];
}

interface VaccineReminder {
  name: string;
  status: "due" | "overdue";
  note: string;
  link: string;
}

export function getVaccineReminders({
  age,
  region,
  riskFlags = [],
  history = [],
}: ReminderParams) {
  const c = region.toUpperCase();
  const scheduleLink = SCHEDULE_LINKS[c] || DEFAULT_LINK;
  const schedule = SCHEDULES[c] || SCHEDULES.DEFAULT;
  const historySet = new Set(history.map((h) => h.toLowerCase()));
  const vaccines: VaccineReminder[] = [];

  for (const item of schedule) {
    if (historySet.has(item.name.toLowerCase())) continue;
    if (age >= item.minAge) {
      const status: "due" | "overdue" = item.maxAge && age > item.maxAge ? "overdue" : "due";
      vaccines.push({ name: item.name, status, note: item.note, link: scheduleLink });
    }
  }

  const lowerFlags = riskFlags.map((f) => f.toLowerCase());
  if (lowerFlags.includes("pregnancy") && !vaccines.some((v) => v.name === "Influenza")) {
    vaccines.push({ name: "Influenza", status: "due", note: "Recommended during pregnancy", link: scheduleLink });
  }
  if (lowerFlags.includes("chronic") && !vaccines.some((v) => v.name === "Pneumococcal")) {
    vaccines.push({ name: "Pneumococcal", status: "due", note: "Recommended for chronic conditions", link: scheduleLink });
  }

  return {
    vaccines,
    disclaimer: "General information only — confirm with your clinician.",
  };
}
