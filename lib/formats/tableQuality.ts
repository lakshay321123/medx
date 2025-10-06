export function sanitizeMarkdownTable(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  let headerDone = false;

  const isSep = (line: string) => /^\s*\|(?:\s*-+\s*\|)+\s*$/.test(line);
  const isRow = (line: string) => /^\s*\|/.test(line);
  const fill = (row: string) =>
    row
      .replace(/\s*\|\s*/g, ' | ')
      .replace(/\|\s*(?=\|)/g, '| - ')
      .replace(/\|\s*$/, '|');

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    if (!isRow(current)) continue;

    if (!headerDone) {
      const header = fill(current.trim());
      out.push(header);
      if (i + 1 < lines.length && isSep(lines[i + 1])) {
        out.push(lines[i + 1].replace(/\s+/g, ' ').trim());
        i++;
      } else {
        const cols = (header.match(/\|/g)?.length || 0) - 1;
        out.push('|' + Array(cols).fill('---').join('|') + '|');
      }
      headerDone = true;
      continue;
    }

    if (isSep(current)) continue;
    const bare = current.replace(/\|/g, '').trim();
    if (!bare) continue;

    out.push(fill(current.trim()));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
