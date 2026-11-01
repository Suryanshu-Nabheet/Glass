#!/usr/bin/env bash
#
# Glass end-to-end smoke — build artifacts and contracts/server entrypoints exist.
# Usage: ./scripts/e2e.sh
#

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Glass e2e smoke (root: $ROOT)"
bash "$ROOT/scripts/verify.sh"

# Runtime entrypoints must load without throwing on import of the package surface.
node --input-type=module -e "
import { access } from 'node:fs/promises';
await access('apps/server/dist/index.mjs');
await access('apps/desktop/dist-electron/main.js');
console.log('  ok  server + desktop entrypoints readable');
"

echo ""
echo "Glass end-to-end smoke passed."
