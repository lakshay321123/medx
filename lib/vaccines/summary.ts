const ALIASES: Record<string, string> = {
  "flu shot": "influenza",
  "flu vaccine": "influenza",
  "hepb": "hepatitis b",
  "hep b": "hepatitis b",
};

const SCHEDULE_LINKS: Record<string, string> = {
  US: "https://www.cdc.gov/vaccines/schedules/index.html",
  UK: "https://www.nhs.uk/conditions/vaccinations/nhs-vaccination-schedule/",
  IN: "https://www.mohfw.gov.in/pdf/National_Immunization_Schedule.pdf",
};

function refsForCountry(country: string, scheduleLink: string) {
  const c = country.toUpperCase();
  const refs = [scheduleLink];
  if (c === "US") refs.push("https://www.cdc.gov/vaccines");
  else if (c === "UK") refs.push("https://www.nhs.uk/conditions/vaccinations/");
  else refs.push("https://www.who.int/teams/immunization-vaccines-and-biologicals");
  return refs;
}

export function getVaccineSummary({ name, country }: { name: string; country: string }) {
  const lowered = name.toLowerCase();
  const canonical = ALIASES[lowered] || name;
  const c = country.toUpperCase();
  const schedule_link = SCHEDULE_LINKS[c] ||
    "https://www.who.int/teams/immunization-vaccines-and-biologicals/diseases";
  const references = refsForCountry(c, schedule_link);
  return {
    vaccine: {
      name: canonical,
      purpose: `Helps prevent ${canonical} infection.`,
      schedule_link,
      common_effects: "Soreness at injection site, mild fever, fatigue.",
      red_flags: "Seek medical care for high fever, trouble breathing, or severe allergic reactions.",
      references,
      legal: "General information only — not medical advice.",
    },
  };
}
