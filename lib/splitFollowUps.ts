export function splitFollowUps(answer: string): { main: string; followUps: string[] } {
  const lines = (answer || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  const followUps: string[] = [];
  const mainLines: string[] = [];
  for (const line of lines) {
    if (/^(next|follow[- ]?up)[:]?/i.test(line) || /\?\s*$/.test(line)) {
      followUps.push(line.replace(/^(next|follow[- ]?up)[:]?/i, "").trim());
    } else {
      mainLines.push(line);
    }
  }
  return { main: mainLines.join("\n"), followUps };
}
