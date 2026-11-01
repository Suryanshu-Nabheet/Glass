#!/usr/bin/env bash
#
# Verify Glass is installed and built for local development.
# Exit 0 = ready. Exit 1 = fix issues printed below.
#
# Usage: ./scripts/verify.sh
#

set -euo pipefail

if [[ "$OSTYPE" == "darwin"* ]]; then
	ROOT="$(cd "$(dirname "$0")/.." && pwd)"
else
	ROOT="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
fi

cd "$ROOT"
FAIL=0

pass() { echo "  ok  $1"; }
fail() { echo "  FAIL  $1"; FAIL=1; }

echo "Glass verification (root: $ROOT)"
echo ""

if command -v bun >/dev/null 2>&1; then
	pass "Bun v$(bun --version)"
else
	fail "bun not found"
fi

if [[ -d node_modules ]]; then
	pass "node_modules present"
else
	fail "node_modules missing — run ./scripts/setup.sh"
fi

if [[ -f packages/contracts/dist/index.mjs || -f packages/contracts/dist/index.js ]]; then
	pass "contracts build (packages/contracts/dist)"
else
	fail "contracts dist missing — run bun run build"
fi

if [[ -f apps/server/dist/index.mjs ]]; then
	pass "server build (apps/server/dist/index.mjs)"
else
	fail "server dist missing — run bun run build"
fi

if [[ -d apps/web/dist ]]; then
	pass "web build (apps/web/dist)"
else
	fail "web dist missing — run bun run build"
fi

if [[ -f apps/desktop/dist-electron/main.js ]]; then
	pass "desktop build (apps/desktop/dist-electron/main.js)"
else
	fail "desktop dist missing — run bun run build"
fi

if bun run typecheck >/dev/null 2>&1; then
	pass "TypeScript (bun run typecheck)"
else
	fail "TypeScript errors — run bun run typecheck"
fi

if bun run fmt:check >/dev/null 2>&1; then
	pass "Formatting (bun run fmt:check)"
else
	fail "Format drift — run bun run fmt"
fi

echo ""
if (( FAIL == 0 )); then
	echo "All checks passed. Dev: bun run dev"
	exit 0
fi

echo "Fix the failures above, then rerun: ./scripts/verify.sh"
echo "Full setup: ./scripts/setup.sh"
exit 1
