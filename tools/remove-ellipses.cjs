// tools/remove-ellipses.cjs
// One-time surgical cleanup: removes literal '...' tokens from source files.
// Run: node tools/remove-ellipses.cjs
const { readFileSync, writeFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const exts = /\.(ts|tsx|js|jsx|json|md|yml|yaml|mjs|cjs)$/;
let touched = 0;
let totalRemoved = 0;

for (const f of walk(process.cwd())) {
  if (!exts.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (!s.includes('...')) continue;

  const removed = (s.match(/\.{3}/g) || []).length;
  const out = s.replace(/\.{3}/g, '');
  writeFileSync(f, out, 'utf8');
  touched++;
  totalRemoved += removed;
  console.log(`• Cleaned ${removed} ellipses in ${f}`);
}

console.log(`\n✅ Done. Files touched: ${touched}. Tokens removed: ${totalRemoved}.`);
console.log('Tip: commit these changes, then rely on prebuild guard going forward.');
