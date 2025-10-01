import fs from "node:fs";
import path from "node:path";

const medxMainPath = path.resolve(process.cwd(), "medx-main");
const root = fs.existsSync(medxMainPath) ? medxMainPath : process.cwd();
const exts = new Set([".tsx", ".jsx", ".ts", ".js"]);
const dryRun = false;

const buttonText = /<button([^>]*)>\s*([A-Za-z][^<{>]+?)\s*<\/button>/g;
const attrText = /\b(aria-label|title)\s*=\s*"([^"{]+)"/g;
function addUseTImport(src: string) {
  if (!src.includes(`import { useT } from "@/components/hooks/useI18n"`)) {
    return src.replace(/(^\s*["']use client["'];?\s*)?/, (m) => (m || "") + `import { useT } from "@/components/hooks/useI18n";\n`);
  }
  return src;
}
function transform(file: string) {
  let src = fs.readFileSync(file, "utf-8");
  const orig = src;

  let changed = false;

  // Wrap button literals
  src = src.replace(buttonText, (m, attrs, text) => {
    // skip icons-only or already localized
    if (text.includes("{") || text.trim().length === 0) return m;
    changed = true;
    return `<button${attrs}>{t(${JSON.stringify(text.trim())})}</button>`;
  });

  // Wrap aria-label/title literals
  src = src.replace(attrText, (m, attr, val) => {
    const v = val.trim();
    if (!/[A-Za-z]/.test(v)) return m;
    changed = true;
    return `${attr}={t(${JSON.stringify(v)})}`;
  });

  if (!changed) return null;

  // make sure useT import is available
  src = addUseTImport(src);

  if (!dryRun) fs.writeFileSync(file, src);
  return { file, patch: diff(orig, src) };
}

// tiny inline diff for preview (kept simple)
function diff(a: string, b: string) {
  const al = a.split("\n"), bl = b.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      if (al[i] !== undefined) out.push("- " + (al[i] ?? ""));
      if (bl[i] !== undefined) out.push("+ " + (bl[i] ?? ""));
    }
  }
  return out.slice(0, 300).join("\n");
}

function walk(dir: string, acc: string[] = []) {
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "components/i18n"].some((s) => name.includes(s))) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (exts.has(path.extname(name))) acc.push(p);
  }
  return acc;
}

const files = walk(root);
const changes: any[] = [];
for (const f of files) {
  const res = transform(f);
  if (res) changes.push(res);
}
console.log(JSON.stringify({ changesCount: changes.length, preview: changes.slice(0, 10) }, null, 2));
