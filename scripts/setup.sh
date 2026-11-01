#!/usr/bin/env bash
#
# End-to-end setup for Glass.
#
# Usage:
#   ./scripts/setup.sh                 Install dependencies and build all packages
#   ./scripts/setup.sh --setup-only    Same as default (no launch)
#   ./scripts/setup.sh --skip-install    Skip bun install
#   ./scripts/setup.sh --skip-build      Skip production build
#   ./scripts/setup.sh -h | --help     Show usage
#

set -euo pipefail

if [[ "$OSTYPE" == "darwin"* ]]; then
	ROOT="$(cd "$(dirname "$0")/.." && pwd)"
else
	ROOT="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
fi

SETUP_ONLY=true
SKIP_INSTALL=false
SKIP_BUILD=false

usage() {
	cat <<'EOF'
Glass setup

./scripts/setup.sh                  Install dependencies and build
./scripts/setup.sh --skip-install   Skip bun install
./scripts/setup.sh --skip-build     Skip turbo build
./scripts/setup.sh -h | --help      Show this help

Prerequisites:
  Bun >= 1.3.9  (https://bun.sh)
  Node.js >= 24 (see package.json engines; mise users: agent/.mise.toml)

After setup:
  bun run dev           Full dev stack (server + web + optional desktop)
  bun run dev:desktop   Electron desktop with live reload
EOF
}

for arg in "$@"; do
	case "$arg" in
		-h|--help)
			usage
			exit 0
			;;
		--setup-only)
			SETUP_ONLY=true
			;;
		--skip-install)
			SKIP_INSTALL=true
			;;
		--skip-build)
			SKIP_BUILD=true
			;;
		*)
			echo "error: unknown argument: $arg" >&2
			usage >&2
			exit 1
			;;
	esac
done

log_step() {
	echo ""
	echo "==> $1"
	echo ""
}

die() {
	echo "error: $*" >&2
	exit 1
}

ensure_bun() {
	command -v bun >/dev/null 2>&1 || die "Bun is required. Install: curl -fsSL https://bun.sh/install | bash"
}

ensure_repo() {
	[[ -f "$ROOT/package.json" ]] || die "Run from the Glass repository."
	grep -q '"name": "glass"' "$ROOT/package.json" 2>/dev/null || \
		die "Expected the standalone Glass package manifest at the repository root."
}

main() {
	cd "$ROOT"
	ensure_repo
	ensure_bun

	echo "Glass setup (root: $ROOT)"

	if command -v mise >/dev/null 2>&1; then
		log_step "Toolchain (mise)"
		if [[ -f "${ROOT}/.mise.toml" ]]; then
			( cd "$ROOT" && mise install )
		fi
	fi

	if [[ "$SKIP_INSTALL" != "true" ]]; then
		log_step "Installing dependencies (bun install)"
		bun install --frozen-lockfile
	else
		echo "Skipping bun install (--skip-install)."
	fi

	if [[ "$SKIP_BUILD" != "true" ]]; then
		log_step "Building packages (turbo build)"
		bun run build
	else
		echo "Skipping build (--skip-build)."
	fi

	echo ""
	echo "Glass setup complete."
	echo "  Dev:     bun run dev"
	echo "  Desktop: bun run dev:desktop"
}

main
