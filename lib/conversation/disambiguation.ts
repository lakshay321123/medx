import { MemoryItem } from "@/lib/memory/useMemoryStore";

const PEDIATRIC_FLOW_ENABLED =
  process.env.PEDIATRIC_FLOW_ENABLED === "true";
const PEDIATRIC_MINIMAL_QUESTIONS =
  process.env.PEDIATRIC_MINIMAL_QUESTIONS === "true";

// Clarifier without memory
export function disambiguate(userMsg: string, context: string): string | null {
  const msg = userMsg.toLowerCase();
  const ctx = context.toLowerCase();

  if (PEDIATRIC_FLOW_ENABLED) {
    const pedsIntent = /(baby|toddler|child|infant)/.test(ctx) &&
      /(medic|remedy|relief|treat)/.test(ctx);
    const symptomMatch = ctx.match(/fever|cold|cough|diarrhea|vomiting|pain/);

    if (pedsIntent) {
      // Red-flag signs
      if (/(dehydration|dry mouth|no tears|sunken eyes|respiratory distress|trouble breathing|persistent vomiting|lethargy)/.test(ctx)) {
        return "These symptoms require urgent medical care. Please seek immediate evaluation.";
      }

      const ageBand =
        /newborn/.test(ctx) ? "newborn" :
        /<\s*6\s*m/.test(ctx) || /\b[0-5]\s*(m|months?)\b/.test(ctx) ? "<6m" :
        /6\s*[-–]\s*24\s*m/.test(ctx) || /\b1[2-9]|[6-9]\s*(m|months?)\b|1\s*(year|yr|y)/.test(ctx) ? "6-24m" :
        /\b([2-5])\s*(y|yr|year)s?\b/.test(ctx) ? "2-5y" :
        /\b([6-9]|1[0-2])\s*(y|yr|year)s?\b/.test(ctx) ? "6-12y" :
        undefined;

      const weightGiven = /\b\d+\s*(kg|kilograms|lbs|pounds)\b/.test(ctx);
      const symptom = symptomMatch ? symptomMatch[0] : undefined;

      if (!ageBand) {
        return "How old is the child? (newborn, <6m, 6–24m, 2–5y, or 6–12y)";
      }
      if (!symptom) {
        return "What symptom are you looking to treat? (fever, cold, cough, diarrhea, vomiting, pain)";
      }
      if (!weightGiven && !PEDIATRIC_MINIMAL_QUESTIONS) {
        return "About how much does the child weigh?";
      }

      if (symptom === "fever" && (ageBand === "newborn" || ageBand === "<6m")) {
        return "Fever in babies under 3 months needs urgent medical evaluation.";
      }

      const shortlist = buildPediatricShortlist(symptom);
      return shortlist;
    }
  }

  if (/spicy|hot/i.test(msg)) {
    return "Got it — do you mean more chili, or just extra seasoning?";
  }
  if (/pain/i.test(msg) && !/where|location|severity/.test(msg)) {
    return "Can you tell me where the pain is and how strong it feels?";
  }
  if (/reset|start over|fresh chat/.test(msg)) {
    return "Do you want me to clear context and begin a fresh chat?";
  }
  return null;
}

function buildPediatricShortlist(symptom: string): string {
  const data: Record<string, Array<{ name: string; help: string; side: string; warn: string; type: string }>> = {
    fever: [
      { name: "Acetaminophen", help: "reduces fever and pain", side: "stomach upset", warn: "overdose harms liver", type: "OTC" },
      { name: "Ibuprofen (>6m)", help: "lowers fever and inflammation", side: "stomach irritation", warn: "avoid if dehydrated", type: "OTC" },
      { name: "Oral rehydration solution", help: "replaces lost fluids", side: "bloating", warn: "seek care if unable to drink", type: "OTC" },
      { name: "Cool compress", help: "comfort measure", side: "chills if too cold", warn: "stop if shivering", type: "OTC" },
      { name: "Clinician visit", help: "rules out serious infection", side: "", warn: "needed if fever >3d or worsening", type: "Rx" },
    ],
    cold: [
      { name: "Saline nasal drops", help: "clears congestion", side: "mild irritation", warn: "use gentle suction", type: "OTC" },
      { name: "Cool-mist humidifier", help: "eases breathing", side: "mold if unclean", warn: "clean daily", type: "OTC" },
      { name: "Acetaminophen", help: "relieves discomfort", side: "stomach upset", warn: "overdose harms liver", type: "OTC" },
      { name: "Honey (>1y)", help: "soothes throat", side: "tooth decay", warn: "avoid <1y", type: "OTC" },
      { name: "Clinician visit", help: "checks for ear infection", side: "", warn: "if symptoms >10d or breathing issues", type: "Rx" },
    ],
    cough: [
      { name: "Honey (>1y)", help: "calms cough", side: "sugar load", warn: "avoid <1y", type: "OTC" },
      { name: "Saline nebulizer", help: "moistens airways", side: "coughing", warn: "stop if distress", type: "OTC" },
      { name: "Acetaminophen", help: "relieves discomfort", side: "stomach upset", warn: "overdose harms liver", type: "OTC" },
      { name: "Cool-mist humidifier", help: "eases breathing", side: "mold if unclean", warn: "clean daily", type: "OTC" },
      { name: "Clinician visit", help: "needed for wheeze or rapid breathing", side: "", warn: "could be serious", type: "Rx" },
    ],
    diarrhea: [
      { name: "Oral rehydration solution", help: "prevents dehydration", side: "bloating", warn: "seek care if no urination", type: "OTC" },
      { name: "Zinc supplement", help: "shortens illness", side: "nausea", warn: "avoid excess", type: "OTC" },
      { name: "Probiotic drops", help: "restores gut flora", side: "gas", warn: "stop if rash", type: "OTC" },
      { name: "Diaper barrier creams", help: "protects skin", side: "rare irritation", warn: "see doctor if severe rash", type: "OTC" },
      { name: "Clinician visit", help: "if blood in stool or high fever", side: "", warn: "may need labs", type: "Rx" },
    ],
    vomiting: [
      { name: "Oral rehydration solution", help: "replaces lost fluids", side: "bloating", warn: "seek care if unable to keep down", type: "OTC" },
      { name: "Probiotic drops", help: "supports gut", side: "gas", warn: "stop if rash", type: "OTC" },
      { name: "Acetaminophen", help: "relieves discomfort", side: "stomach upset", warn: "overdose harms liver", type: "OTC" },
      { name: "Small frequent feeds", help: "reduces nausea", side: "none", warn: "skip if choking risk", type: "OTC" },
      { name: "Clinician visit", help: "needed for persistent vomiting", side: "", warn: "risk of dehydration", type: "Rx" },
    ],
    pain: [
      { name: "Acetaminophen", help: "mild pain relief", side: "stomach upset", warn: "overdose harms liver", type: "OTC" },
      { name: "Ibuprofen (>6m)", help: "pain and inflammation", side: "stomach irritation", warn: "avoid if dehydrated", type: "OTC" },
      { name: "Cold pack", help: "reduces swelling", side: "skin redness", warn: "wrap to avoid frostbite", type: "OTC" },
      { name: "Gentle massage", help: "soothes muscle pain", side: "temporary soreness", warn: "stop if discomfort", type: "OTC" },
      { name: "Clinician visit", help: "assesses unexplained pain", side: "", warn: "especially after injury", type: "Rx" },
    ],
  };

  const items = data[symptom as keyof typeof data] || [];
  const lines = items.map((x, i) =>
    `${i + 1}. ${x.name} — ${x.help}; side: ${x.side}; warning: ${x.warn}; ${x.type}.`
  );
  lines.push("General information only — not medical advice.");
  return lines.join("\n");
}

// Clarifier with memory
export function disambiguateWithMemory(
  userMsg: string,
  memories: MemoryItem[]
): string | null {
  return null;
}
