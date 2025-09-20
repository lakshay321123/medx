import CodingToolClient from "@/components/coding/CodingToolClient";
import { generateUniversalAnswer } from "@/lib/coding/generateUniversalAnswer";
import type { CodingCaseInput, UniversalCodingMode } from "@/types/coding";

async function generateCodingGuide(input: CodingCaseInput, mode: UniversalCodingMode) {
  "use server";
  return generateUniversalAnswer(input, mode);
}

export default function CodingToolPage() {
  return <CodingToolClient onGenerate={generateCodingGuide} />;
}
