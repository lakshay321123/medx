import { fetchPatientDataset } from "./db";
import { computeDomainResults, MODEL_ID } from "./domain";
import { generateSummaries } from "./summaries";

export async function recomputeRisk(patientId: string) {
  const dataset = await fetchPatientDataset(patientId);
  const { features, domains } = computeDomainResults(dataset);
  return { dataset, features, domains, model: MODEL_ID };
}

export { fetchPatientDataset, computeDomainResults, generateSummaries, MODEL_ID };
