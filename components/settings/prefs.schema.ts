export type PrefRow =
  | { type: "toggle"; id: string; labelKey: string; descKey?: string }
  | { type: "select"; id: string; labelKey: string; descKey?: string; optionsKey: string }
  | { type: "link"; id: string; labelKey: string; href: string; descKey?: string }
  | { type: "action"; id: string; labelKey: string; action: "reset" | "export" | "clear" };

export type PrefSection = { id: string; titleKey: string; rows: PrefRow[] };

export const PREF_SECTIONS: PrefSection[] = [
  {
    id: "General",
    titleKey: "General",
    rows: [
      {
        type: "select",
        id: "theme",
        labelKey: "Theme",
        descKey: "Select how the interface adapts to your system.",
        optionsKey: "preferences.theme",
      },
      {
        type: "select",
        id: "language",
        labelKey: "Language",
        descKey: "Choose your preferred conversational language.",
        optionsKey: "preferences.language",
      },
      {
        type: "select",
        id: "voice",
        labelKey: "Voice",
        descKey: "Preview and select the voice used for spoken responses.",
        optionsKey: "preferences.voice",
      },
    ],
  },
  {
    id: "Notifications",
    titleKey: "Notifications",
    rows: [],
  },
  {
    id: "Personalization",
    titleKey: "Personalization",
    rows: [],
  },
  {
    id: "Connectors",
    titleKey: "Connectors",
    rows: [],
  },
  {
    id: "Schedules",
    titleKey: "Schedules",
    rows: [],
  },
  {
    id: "Data controls",
    titleKey: "Data controls",
    rows: [
      {
        type: "toggle",
        id: "memoryEnabled",
        labelKey: "Enabled",
        descKey: "Remember preferences and key facts with your consent. You can turn this off anytime.",
      },
      {
        type: "toggle",
        id: "memoryAutosave",
        labelKey: "Auto-save detected memories",
        descKey: "Automatically save detected memories.",
      },
    ],
  },
  {
    id: "Security",
    titleKey: "Security",
    rows: [],
  },
  {
    id: "Account",
    titleKey: "Account",
    rows: [],
  },
];
