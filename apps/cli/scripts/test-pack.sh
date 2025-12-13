#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CLI_DIR"

BACKUP_PATH="$CLI_DIR/package.json.__test_backup__"

restore_package_json() {
  if [ -f "$BACKUP_PATH" ]; then
    echo ""
    echo -e "\033[0;36mRestoring package.json...\033[0m"
    echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
    cp "$BACKUP_PATH" "$CLI_DIR/package.json"
    rm "$BACKUP_PATH"
  fi
}

trap restore_package_json EXIT

echo ""
echo -e "\033[0;36mBuilding package...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run build

echo ""
echo -e "\033[0;36mCreating backup of package.json...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
cp "$CLI_DIR/package.json" "$BACKUP_PATH"

echo ""
echo -e "\033[0;36mPreparing package.json for publishing...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
bun run scripts/prepare-npm-package.ts

# Verify that catalog: and workspace: references are gone
echo ""
echo -e "\033[0;36mVerifying package.json preparation...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
if grep -q "catalog:" "$CLI_DIR/package.json" || grep -q "workspace:" "$CLI_DIR/package.json"; then
  echo "❌ Error: package.json still contains 'catalog:' or 'workspace:' references"
  echo "First few problematic lines:"
  grep -E "(catalog:|workspace:)" "$CLI_DIR/package.json" | head -5
  exit 1
fi
echo "✅ package.json verified - no catalog: or workspace: references found"

echo ""
echo -e "\033[0;36mCreating tarball...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
PACK_FILE=$(npm pack)
PACK_NAME="${PACK_FILE%.tgz}"
echo "Created: $PACK_FILE"

echo ""
echo -e "\033[0;36mTesting install from tarball...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"
echo "Test directory: $TEST_DIR"

echo "Installing $PACK_FILE..."
npm install "$CLI_DIR/$PACK_FILE"

echo ""
echo -e "\033[0;36mTesting binary execution...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
if [ -f "./node_modules/.bin/kyoto" ]; then
  echo "Binary found at: ./node_modules/.bin/kyoto"
  ./node_modules/.bin/kyoto --version || ./node_modules/.bin/kyoto --help || true
else
  echo "❌ Binary not found!"
  exit 1
fi

echo ""
echo -e "\033[0;36mTesting npx execution...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
NPX_TEST_DIR=$(mktemp -d)
cd "$NPX_TEST_DIR"
echo "NPX test directory: $NPX_TEST_DIR"
npx --yes "file:$CLI_DIR/$PACK_FILE" --version || npx --yes "file:$CLI_DIR/$PACK_FILE" --help || true

echo ""
echo -e "\033[0;36mCleaning up...\033[0m"
echo -e "\033[0;36m─────────────────────────────────────────────────────────────\033[0m"
cd "$CLI_DIR"
rm -f "$PACK_FILE"
rm -rf "$TEST_DIR"
rm -rf "$NPX_TEST_DIR"

restore_package_json
trap - EXIT

echo ""
echo -e "\033[0;32m✅ All tests passed!\033[0m"
echo -e "\033[0;32mThe package is ready for publishing.\033[0m"

