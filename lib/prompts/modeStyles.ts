import { WELLNESS_STYLE, BEHAVIORAL_STYLE, ALLIED_STYLE, TECHNICAL_SCI_STYLE, SUPPORTIVE_STYLE, COMPLIANCE_STYLE } from "./domains";
import { BEHAV_MED_STYLE, ENV_OCC_STYLE, DATA_TECH_STYLE, GENOMICS_STYLE, PREVENTIVE_STYLE, SYSTEMS_POLICY_STYLE } from "./advancedDomains";
import { DOCTOR_STYLE } from "./doctor";
import { CLINICAL_STYLE } from "./clinical";
import { THERAPY_STYLE } from "./therapy";
import type { Mode } from "@/lib/formats/types";

/** Maps each chat mode to its specialized system prompt style */
export const MODE_STYLES: Record<Mode, string> = {
  wellness: [WELLNESS_STYLE, PREVENTIVE_STYLE].join("\n\n"),
  therapy: THERAPY_STYLE,
  clinical: [CLINICAL_STYLE, DOCTOR_STYLE].join("\n\n"),
  clinical_research: [CLINICAL_STYLE, DOCTOR_STYLE, TECHNICAL_SCI_STYLE].join("\n\n"),
  wellness_research: [WELLNESS_STYLE, TECHNICAL_SCI_STYLE].join("\n\n"),
  aidoc: [DOCTOR_STYLE, CLINICAL_STYLE].join("\n\n"),
};
