// tools/check-placeholders.cjs
// Fails the build if any file contains the literal '...' placeholder.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'tools' || name === '.next') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

const exts = /\.(ts|tsx|js|jsx|json|md|yml|yaml|mjs|cjs)$/;
const bad = [];

for (const f of walk(process.cwd())) {
  if (!exts.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (/\.\.\.(?![A-Za-z0-9_$\(\[])/.test(s)) bad.push(f);
}

if (bad.length) {
  console.error('ERROR: Placeholder "..." found in files:');
  for (const f of bad) console.error(' -', f);
  process.exit(1);
} else {
  console.log('✅ No "..." placeholders detected.');
}
