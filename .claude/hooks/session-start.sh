#!/bin/bash
# Prepares a Claude Code on the web session to lint, build and run the suite.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Run on the Node `.nvmrc` pins, which is what Workers Builds runs. The sandbox
# ships an older major, so the suite would otherwise test on a Node that
# production never sees. The tarball is checked against nodejs.org's SHA-256
# list before it is unpacked.
NODE_VERSION="v$(tr -d '[:space:]v' < .nvmrc)"
case "$(uname -m)" in
  x86_64) NODE_ARCH=x64 ;;
  aarch64 | arm64) NODE_ARCH=arm64 ;;
  *) echo "session-start: no Node build for $(uname -m)" >&2; exit 1 ;;
esac
NODE_DIR="/opt/node-$NODE_VERSION"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  NODE_TARBALL="node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
  NODE_TMP="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$NODE_TARBALL" -o "$NODE_TMP/$NODE_TARBALL"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" -o "$NODE_TMP/SHASUMS256.txt"
  (cd "$NODE_TMP" && grep " $NODE_TARBALL\$" SHASUMS256.txt | sha256sum -c --quiet -)
  mkdir -p "$NODE_DIR"
  tar -xJf "$NODE_TMP/$NODE_TARBALL" -C "$NODE_DIR" --strip-components=1
  rm -rf "$NODE_TMP"
fi
export PATH="$NODE_DIR/bin:$PATH"

# Install with the npm `packageManager` pins, not whichever came with Node. An
# older npm rewrites package-lock.json on every session start (it drops the
# `libc` fields of the native packages) and leaves that change for the
# session to commit by mistake.
npx -y "$(node -p 'require("./package.json").packageManager')" install --no-audit --no-fund

# Astro 7 backgrounds `astro dev` / `astro preview` when it detects an agent,
# which Playwright's webServer reads as the server exiting. Setting these turns
# that detection off (node_modules/astro/dist/cli/preview/index.js).
# The sandbox Chromium predates the revision Playwright pins, and runs as root;
# playwright.config.ts reads the last two.
cat >> "$CLAUDE_ENV_FILE" << VARS
export PATH="$NODE_DIR/bin:\$PATH"
VARS
cat >> "$CLAUDE_ENV_FILE" << 'VARS'
export ASTRO_TELEMETRY_DISABLED=1
export ASTRO_DEV_BACKGROUND=1
export ASTRO_PREVIEW_BACKGROUND=1
export PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium
export PLAYWRIGHT_NO_SANDBOX=1
VARS
