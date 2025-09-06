export function splitFollowUps(answer: string): { main: string; followUps: string[] } {
  const lines = (answer || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  const followUps: string[] = [];
  const mainLines: string[] = [];
  for (const line of lines) {
    if (/^follow[- ]?up[:]/i.test(line)) {
      followUps.push(line.replace(/^follow[- ]?up[:]\s*/i, ""));
    } else {
      mainLines.push(line);
    }
  }
  return { main: mainLines.join("\n"), followUps };
}
