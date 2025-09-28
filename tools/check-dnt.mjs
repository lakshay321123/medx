import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "i18n", "messages");
const dntPath = path.join(root, "i18n", "dnt.json");

if (!fs.existsSync(messagesDir)) {
  process.exit(0);
}

const tokens = JSON.parse(fs.readFileSync(dntPath, "utf8"));
const violations = [];

const tokenPatterns = tokens
  .filter(token => typeof token === "string" && token.trim().length > 0)
  .map(token => ({
    token,
    regex: buildTokenRegex(token),
  }));

const files = fs
  .readdirSync(messagesDir)
  .filter(file => file.endsWith(".json"))
  .map(file => path.join(messagesDir, file));

function buildTokenRegex(token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}0-9])${escaped}([^\\p{L}0-9]|$)`, "u");
}

function scan(value, keyPath, file) {
  if (typeof value === "string") {
    for (const { token, regex } of tokenPatterns) {
      if (regex.test(value)) {
        violations.push({ file, key: keyPath.join("."), token });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scan(entry, [...keyPath, String(index)], file));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      scan(v, [...keyPath, k], file);
    }
  }
}

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    scan(data, [], file);
  } catch (error) {
    console.error(`[check-dnt] Failed to parse ${file}:`, error);
    process.exitCode = 1;
  }
}

if (violations.length > 0) {
  console.error("[check-dnt] DNT tokens must not appear in localized strings.");
  for (const violation of violations) {
    const relative = path.relative(root, violation.file);
    console.error(`  ${relative} :: ${violation.key} -> ${violation.token}`);
  }
  process.exit(1);
}
