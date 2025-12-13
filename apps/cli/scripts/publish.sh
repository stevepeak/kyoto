#!/usr/bin/env bash
set -euo pipefail

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to CLI directory
cd "$CLI_DIR"

# Initialize backup path variable
BACKUP_PATH="$CLI_DIR/package.json.__prepack_backup__"

# Cleanup function to restore package.json
restore_package_json() {
  if [ -f "$BACKUP_PATH" ]; then
    echo ""
    echo -e "\033[0;36mRestoring package.json...\033[0m"
    echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
    cp "$BACKUP_PATH" "$CLI_DIR/package.json"
    rm "$BACKUP_PATH"
  fi
}

# Set trap to always restore package.json on exit (success or failure)
trap restore_package_json EXIT

# Run typecheck (pretypecheck will generate version first)
echo ""
echo -e "\033[0;36mType checking...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run --cwd="$CLI_DIR" typecheck

echo ""
echo -e "\033[0;36mSetting version...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run scripts/generate-version.ts
VERSION=$(grep -o '"version": "[^"]*"' "$CLI_DIR/package.json" | cut -d'"' -f4)
echo -e "\033[0;36mPublishing version: \033[1;36m$VERSION\033[0m"


# Build only the CLI package (run build commands directly to avoid turbo)
echo ""
echo -e "\033[0;36mBundling...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run --cwd="$CLI_DIR" build

# Create backup clone of package.json FIRST to recover in case of any error
echo ""
echo -e "\033[0;36mCreating backup of package.json...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
cp "$CLI_DIR/package.json" "$BACKUP_PATH"
echo "Backup created at $BACKUP_PATH"

# Prepare package.json for publishing
echo ""
echo -e "\033[0;36mPreparing package.json for publishing...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run scripts/prepare-npm-package.ts

# Attempt to publish from CLI directory
echo ""
echo -e "\033[0;36mPublishing to npm...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
EXIT_CODE=0
npm publish --access public --ignore-scripts || EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo ""
  echo -e "\033[0;36mTesting published package via npx...\033[0m"
  echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
  echo -e "\033[0;36mRunning:\033[0m \033[1;36mnpx --yes @usekyoto/cli\033[0m"

  # Avoid set -e terminating the script on a non-zero exit from the smoke test.
  set +e
  NPX_OUTPUT="$(npx --yes @usekyoto/cli 2>&1)"
  NPX_EXIT_CODE=$?
  set -e

  echo ""
  echo -e "\033[0;36mnpx output:\033[0m"
  echo "$NPX_OUTPUT"

  if [ "$NPX_EXIT_CODE" -ne 0 ]; then
    EXIT_CODE="$NPX_EXIT_CODE"
  fi
fi



# Remove trap since we're about to exit normally (restore will happen via trap)
# But we need to disable the trap first to avoid double restore
trap - EXIT
restore_package_json

# Exit with the publish exit code (default to 1 if EXIT_CODE is unset)
exit ${EXIT_CODE:-1}
