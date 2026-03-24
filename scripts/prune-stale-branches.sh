#!/bin/bash
# Prune stale remote branches that have been merged to main.
# Run: bash scripts/prune-stale-branches.sh
# DRY RUN by default — set EXECUTE=1 to actually delete.

set -e
EXECUTE=${EXECUTE:-0}

echo "Fetching latest..."
git fetch --prune origin

MERGED=$(git branch -r --merged origin/main | grep -v 'main$' | grep -v 'HEAD' | sed 's|origin/||' | head -200)
COUNT=$(echo "$MERGED" | grep -c . || true)

echo "Found $COUNT merged branches."

if [ "$EXECUTE" = "1" ]; then
  echo "DELETING merged branches..."
  for branch in $MERGED; do
    echo "  Deleting: $branch"
    git push origin --delete "$branch" 2>/dev/null || echo "  (already deleted)"
  done
  echo "Done. Deleted $COUNT branches."
else
  echo ""
  echo "DRY RUN — would delete these branches:"
  echo "$MERGED" | head -20
  echo "..."
  echo ""
  echo "Run with EXECUTE=1 to actually delete:"
  echo "  EXECUTE=1 bash scripts/prune-stale-branches.sh"
fi
