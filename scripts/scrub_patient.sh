#!/usr/bin/env bash
set -euo pipefail

# === CONFIG: what to purge ===
BAD_FULL="Lakshay Mehra"
BAD_FIRST="Lakshay"
BAD_LAST="Mehra"
BAD_UUID="5a8ce915-8faf-4fb6-9e62-7e7fc0b9c9e0"   # replace if you saw a different leaked id

SAFE_FULL="Demo Patient"
SAFE_FIRST="Demo"
SAFE_LAST="Patient"
SAFE_UUID="00000000-0000-0000-0000-000000000000"

# 1) Safety: ensure we're in a git repo with a clean index
git rev-parse --is-inside-work-tree >/dev/null 2>&1
git add -A && git diff --cached --quiet || true

# 2) Show all hits so you can review
echo ">>> Scanning for offending strings..."
rg -n --hidden -S -i "(?:$BAD_UUID|$BAD_FULL|$BAD_FIRST|$BAD_LAST)" \
  --glob '!.git/**' --glob '!scripts/scrub_patient.sh' || true

# 3) Replace in tracked text files (skip binaries, lockfiles, dist)
echo ">>> Scrubbing tracked files..."
FILES=$(rg -0 --hidden -S -i "(?:$BAD_UUID|$BAD_FULL|$BAD_FIRST|$BAD_LAST)" \
  --files-with-matches \
  --glob '!.git/**' --glob '!dist/**' --glob '!node_modules/**' \
  --glob '!package-lock.json' --glob '!pnpm-lock.yaml' --glob '!yarn.lock' \
  --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.webp' --glob '!*.pdf' --glob '!*.ico' \
  --glob '!scripts/scrub_patient.sh' \
  | tr '\0' '\n' || true)

# Cross-platform in-place sed
while IFS= read -r f; do
  [ -n "$f" ] || continue
  # Skip binary-ish files
  if file "$f" | grep -qiE 'binary|image|archive'; then continue; fi
  # Apply ordered replacements (full name first to avoid double-touch)
  sed -E -i.bak "s/$BAD_UUID/$SAFE_UUID/g" "$f" || true
  sed -E -i.bak "s/$BAD_FULL/$SAFE_FULL/g" "$f" || true
  sed -E -i.bak "s/\b$BAD_FIRST\b/$SAFE_FIRST/gI" "$f" || true
  sed -E -i.bak "s/\b$BAD_LAST\b/$SAFE_LAST/gI" "$f" || true
  rm -f "$f.bak"
done <<< "$FILES"

# 4) Re-scan to ensure nothing remains
echo ">>> Verifying scrub..."
if rg -n --hidden -S -i "(?:$BAD_UUID|$BAD_FULL|$BAD_FIRST|$BAD_LAST)" \
  --glob '!.git/**' --glob '!scripts/scrub_patient.sh'; then
  echo "!!! Scrub incomplete. Fix remaining matches above, then re-run."
  exit 1
fi

# 5) Commit the scrub
git add -A
git commit -m "chore: scrub private patient seed (remove Lakshay Mehra + UUID) and replace with Demo Patient"

# 6) Install a pre-commit guard to BLOCK reintroduction
echo ">>> Installing pre-commit guard..."
mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
PATTERN='(Lakshay[[:space:]]*Mehra|Lakshay\b|Mehra\b|5a8ce915-8faf-4fb6-9e62-7e7fc0b9c9e0)'
if git diff --cached -U0 | grep -Eiq "$PATTERN"; then
  echo "✖ Blocked: forbidden patient data detected in staged changes."
  echo "  Remove/replace references to Lakshay Mehra / leaked UUID before committing."
  exit 1
fi
HOOK
chmod +x .git/hooks/pre-commit

echo "✅ Scrubbed and guard installed."
echo "   Push your branch and let CI run. Add the same grep to CI to enforce server-side too."
