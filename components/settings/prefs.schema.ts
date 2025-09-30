export type PrefRow =
  | { type: "toggle"; id: string; labelKey: string; descKey?: string }
  | {
      type: "select";
      id: string;
      labelKey: string;
      descKey?: string;
      optionsKey: string;
    }
  | { type: "link"; id: string; labelKey: string; href: string; descKey?: string }
  | { type: "action"; id: string; labelKey: string; action: "reset" | "export" | "clear" };

export type PrefSection = {
  id: string;
  titleKey: string;
  rows: PrefRow[];
};

export const PREF_SECTIONS: PrefSection[] = [
  {
    id: "general",
    titleKey: "General",
    rows: [
      {
        type: "select",
        id: "theme",
        labelKey: "Theme",
        descKey: "Select how the interface adapts to your system.",
        optionsKey: "theme",
      },
      {
        type: "select",
        id: "lang",
        labelKey: "Language",
        descKey: "Choose your preferred conversational language.",
        optionsKey: "lang",
      },
      {
        type: "select",
        id: "tone",
        labelKey: "Tone",
        descKey: "Control how MedX responds in chat.",
        optionsKey: "tone",
      },
      {
        type: "toggle",
        id: "quickActions",
        labelKey: "Quick actions",
        descKey: "Show shortcuts above the composer.",
      },
      {
        type: "toggle",
        id: "compact",
        labelKey: "Compact layout",
        descKey: "Reduce spacing across the interface.",
      },
    ],
  },
  {
    id: "notifications",
    titleKey: "Notifications",
    rows: [
      {
        type: "toggle",
        id: "medReminders",
        labelKey: "Medication reminders",
        descKey: "Receive nudges for scheduled doses.",
      },
      {
        type: "toggle",
        id: "labUpdates",
        labelKey: "Lab updates",
        descKey: "Get notified when new labs are available.",
      },
      {
        type: "toggle",
        id: "weeklyDigest",
        labelKey: "Weekly digest",
        descKey: "Email summary of key insights.",
      },
    ],
  },
  {
    id: "personalization",
    titleKey: "Personalization",
    rows: [
      {
        type: "select",
        id: "accent",
        labelKey: "Accent color",
        descKey: "Apply a brand accent across MedX.",
        optionsKey: "accent",
      },
      {
        type: "toggle",
        id: "memoryEnabled",
        labelKey: "Smart memory",
        descKey: "Remember details you approve.",
      },
      {
        type: "toggle",
        id: "memoryAutosave",
        labelKey: "Auto-save detected memories",
        descKey: "Capture important context automatically.",
      },
    ],
  },
  {
    id: "connectors",
    titleKey: "Connectors",
    rows: [
      {
        type: "link",
        id: "manage-connectors",
        labelKey: "Manage integrations",
        descKey: "Connect Apple Health, wearables, and more.",
        href: "/settings/connectors",
      },
    ],
  },
  {
    id: "schedules",
    titleKey: "Schedules",
    rows: [
      {
        type: "link",
        id: "automation",
        labelKey: "Automation rules",
        descKey: "Configure recurring summaries and follow-ups.",
        href: "/settings/schedules",
      },
    ],
  },
  {
    id: "data-controls",
    titleKey: "Data controls",
    rows: [
      {
        type: "toggle",
        id: "maskSensitive",
        labelKey: "Mask sensitive content",
        descKey: "Hide personal details in transcripts.",
      },
      {
        type: "action",
        id: "export-data",
        labelKey: "Export data",
        action: "export",
      },
      {
        type: "action",
        id: "reset-preferences",
        labelKey: "Reset preferences",
        action: "reset",
      },
      {
        type: "action",
        id: "clear-history",
        labelKey: "Clear chat history",
        action: "clear",
      },
    ],
  },
  {
    id: "security",
    titleKey: "Security",
    rows: [
      {
        type: "toggle",
        id: "passcode",
        labelKey: "Passcode lock",
        descKey: "Require a passcode after inactivity.",
      },
      {
        type: "select",
        id: "sessionTimeout",
        labelKey: "Session timeout",
        descKey: "Choose when MedX locks automatically.",
        optionsKey: "sessionTimeout",
      },
    ],
  },
  {
    id: "account",
    titleKey: "Account",
    rows: [
      {
        type: "select",
        id: "plan",
        labelKey: "Plan",
        descKey: "Switch between Free and Pro tiers.",
        optionsKey: "plan",
      },
      {
        type: "link",
        id: "manage-subscription",
        labelKey: "Manage subscription",
        href: "/settings/billing",
      },
    ],
  },
];
