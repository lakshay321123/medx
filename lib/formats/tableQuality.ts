export function sanitizeMarkdownTable(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  let headerDone = false;

  const isSep = (line: string) => /^\s*\|(?:\s*-+\s*\|)+\s*$/.test(line);
  const isRow = (line: string) => /^\s*\|/.test(line);
  // Fill all empty cells (leading/middle/trailing) and normalize spacing
  const fill = (row: string) => {
    const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '');
    const cells = inner.split('|').map(cell => {
      const value = cell.trim();
      return value === '' ? '-' : value;
    });
    return `| ${cells.join(' | ')} |`;
  };

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    if (!isRow(current)) continue;

    if (!headerDone) {
      const header = fill(current);
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

    out.push(fill(current));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
