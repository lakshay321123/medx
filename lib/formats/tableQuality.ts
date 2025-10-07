export function sanitizeMarkdownTable(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  let headerDone = false;

  const isSep = (L: string) => /^\s*\|(?:\s*-+\s*\|)+\s*$/.test(L);
  const isRow = (L: string) => /^\s*\|/.test(L);
  const fill = (row: string) => {
    const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '');
    const cells = inner.split('|').map(cell => {
      const value = cell.trim();
      return value === '' ? '-' : value;
    });
    return `| ${cells.join(' | ')} |`;
  };

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!isRow(L)) continue;

    if (!headerDone) {
      const hdr = fill(L);
      out.push(hdr);
      if (i + 1 < lines.length && isSep(lines[i + 1])) {
        out.push(lines[i + 1].replace(/\s+/g, ' ').trim());
        i++;
      } else {
        const cols = (hdr.match(/\|/g)?.length || 0) - 1;
        out.push('|' + Array(cols).fill('---').join('|') + '|');
      }
      headerDone = true;
      continue;
    }

    if (isSep(L)) continue;
    const bare = L.replace(/\|/g, '').trim();
    if (!bare) continue;

    out.push(fill(L));
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
