export function analyzeTable(md: string) {
  const rows = md.trim().split('\n').filter(line => /^\s*\|/.test(line));
  if (rows.length < 2) return { rows: 0, cols: 0, emptyCells: 0, density: 0 };

  const header = rows[0].split('|').slice(1, -1).map(cell => cell.trim());
  const cols = header.length;
  let emptyCells = 0;
  let cellCount = 0;
  let dataRows = 0;

  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length !== cols) continue;
    dataRows++;
    for (const cell of cells) {
      cellCount++;
      if (!cell || cell === '-' || cell === '—' || cell.toLowerCase() === 'n/a') {
        emptyCells++;
      }
    }
  }

  const density = cellCount ? 1 - emptyCells / cellCount : 0;
  return { rows: dataRows, cols, emptyCells, density };
}

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
