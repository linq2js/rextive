#!/bin/bash
# Git sync helper that handles conflicts gracefully
# Auto-resolves version conflicts by keeping local version (ours)

# Fetch latest changes
git fetch origin

# Check if we're behind remote
if git diff --quiet HEAD origin/main; then
  echo "Already up to date with origin/main"
  exit 0
fi

# Try to pull with rebase
if git pull --rebase 2>&1; then
  echo "Successfully pulled and rebased"
  exit 0
fi

# If rebase failed, check for conflicts in package files
CONFLICTS=$(git status --porcelain | grep -E '^UU.*package\.(json|lock\.json)' || true)
if [ -n "$CONFLICTS" ]; then
  echo "Resolving version conflicts by keeping local version..."
  # Keep our version for package files (we just published this version)
  git checkout --ours package.json package-lock.json 2>/dev/null || true
  git add package.json package-lock.json 2>/dev/null || true
  
  # Continue rebase
  if git rebase --continue 2>&1; then
    echo "Successfully resolved conflicts and continued rebase"
    exit 0
  fi
fi

# If we get here, rebase failed - abort and try merge instead
echo "Rebase failed, trying merge strategy..."
git rebase --abort 2>/dev/null || true

# Try merge with ours strategy for version files
if git pull --no-rebase -X ours package.json package-lock.json 2>/dev/null || git pull --no-rebase 2>&1; then
  echo "Successfully merged"
  exit 0
fi

# If all else fails, just pull (might have conflicts but at least we tried)
echo "Warning: Could not automatically sync. Manual intervention may be needed."
git pull || true
exit 0

