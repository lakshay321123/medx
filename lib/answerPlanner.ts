export type DetailLevel = "brief" | "standard" | "expert";

export type HealthTopicSlice =
  | "definition" | "types" | "symptoms" | "causes"
  | "home_care" | "treatment" | "prevention"
  | "red_flags" | "when_to_seek_help" | "faq" | "references";

export interface Plan {
  topic: string;                // e.g., "back pain"
  slices: HealthTopicSlice[];   // which sections to include in THIS turn
  detail: DetailLevel;          // brief by default
  followUps: HealthTopicSlice[];// buttons to offer next
  wordCap: number;              // hard cap for the LLM
}

export function defaultPlan(topic: string): Plan {
  return {
    topic,
    slices: ["definition", "types"],
    detail: "brief",
    followUps: ["symptoms","causes","home_care","when_to_seek_help","prevention"],
    wordCap: 160,
  };
}

// On chip click, derive next plan:
export function nextPlanFromChip(topic: string, chip: HealthTopicSlice, previous?: Plan): Plan {
  const detail: DetailLevel = previous?.detail ?? "brief";
  const base = { topic, slices: [chip], detail };
  switch (chip) {
    case "symptoms":
      return { ...base, followUps: ["red_flags","causes","home_care","treatment"], wordCap: 180 };
    case "causes":
      return { ...base, followUps: ["symptoms","home_care","prevention"], wordCap: 180 };
    case "home_care":
      return { ...base, followUps: ["when_to_seek_help","treatment","prevention"], wordCap: 180 };
    case "when_to_seek_help":
      return { ...base, followUps: ["red_flags","treatment"], wordCap: 160 };
    default:
      return { ...base, followUps: ["symptoms","causes","home_care","when_to_seek_help"], wordCap: 160 };
  }
}
