import fs from 'fs';
import path from 'path';

export interface ReportSummary {
  flags?: string[];
}

export interface SecondOpinionOutput {
  secondOpinion: {
    questions: string[];
    monitoring: string[];
    references: string[];
  };
}

function loadQuestionBank() {
  const dir = path.join(process.cwd(), 'data', 'questions');
  const bank: Record<string, { questions: string[]; monitoring?: string[]; references?: string[] }> = {};
  if (!fs.existsSync(dir)) return bank;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.json')) {
      const key = path.basename(file, '.json');
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        bank[key] = data;
      } catch {
        // ignore bad json
      }
    }
  }
  return bank;
}

export function generateSecondOpinion(summary: ReportSummary = {}, condition?: string, concerns?: string[]): SecondOpinionOutput | null {
  if (process.env.SECOND_OPINION_MODE !== 'true') return null;

  const bank = loadQuestionBank();
  const result = { questions: [] as string[], monitoring: [] as string[], references: [] as string[] };
  const flags = summary.flags || [];

  for (const flag of flags) {
    const entry = bank[flag];
    if (entry) {
      result.questions.push(...(entry.questions || []));
      if (entry.monitoring) result.monitoring.push(...entry.monitoring);
      if (entry.references) result.references.push(...entry.references);
    }
  }

  // If not enough questions, supplement with generic
  const generic = bank['generic'];
  if (result.questions.length < 5 && generic) {
    const needed = 5 - result.questions.length;
    result.questions.push(...generic.questions.slice(0, needed));
    if (generic.monitoring) result.monitoring.push(...generic.monitoring);
    if (generic.references) result.references.push(...generic.references);
  }

  // Fallback to generic entirely if no questions
  if (result.questions.length === 0 && generic) {
    result.questions.push(...generic.questions);
    if (generic.monitoring) result.monitoring.push(...generic.monitoring);
    if (generic.references) result.references.push(...generic.references);
  }

  // Deduplicate and cap
  result.questions = Array.from(new Set(result.questions)).slice(0, 10);
  result.monitoring = Array.from(new Set(result.monitoring));
  result.references = Array.from(new Set(result.references));

  return { secondOpinion: result };
}
