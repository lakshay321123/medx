import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const EXTS = new Set([".md", ".mdx"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "public",
  "supabase",
  "scripts",
  "test",
  "tests",
]);
const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/g;
const PLACEHOLDER_PATTERNS = [/\$\{/, /\byour-/i];
const urls = new Set<string>();
const TIMEOUT_MS = 4000;
const CONCURRENCY = 6;

function walk(dir: string) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (EXTS.has(path.extname(name))) {
      const text = fs.readFileSync(filePath, "utf8");
      for (const match of text.matchAll(URL_PATTERN)) {
        const raw = match[0];
        let cleaned = raw.replace(/[)>,.;'"`]+$/g, "");
        cleaned = cleaned.replace(/&amp;/g, "&");
        if (/localhost|127\.0\.0\.1/i.test(cleaned)) continue;
        if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(cleaned))) continue;
        urls.add(cleaned);
      }
    }
  }
}

async function headOrGet(url: string) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!response.ok || response.status >= 400) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { Range: "bytes=0-64" },
        signal: ctrl.signal,
      });
    }
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  walk(ROOT);
  const allUrls = Array.from(urls);
  const bad: string[] = [];
  let index = 0;
  const workers = Math.min(CONCURRENCY, allUrls.length || 1);
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (true) {
        const currentIndex = index++;
        if (currentIndex >= allUrls.length) break;
        const url = allUrls[currentIndex];
        if (!(await headOrGet(url))) {
          bad.push(url);
        }
      }
    })
  );
  if (bad.length) {
    console.error("Dead links:\n" + bad.join("\n"));
    process.exit(1);
  }
  console.log(`All static links OK: ${allUrls.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
