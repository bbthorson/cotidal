#!/bin/bash
# Prepares a Claude Code on the web session to lint, build and run the suite.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund

# Astro 7 backgrounds `astro dev` / `astro preview` when it detects an agent,
# which Playwright's webServer reads as the server exiting. Setting these turns
# that detection off (node_modules/astro/dist/cli/preview/index.js).
# The sandbox Chromium predates the revision Playwright pins, and runs as root;
# playwright.config.ts reads the last two.
cat >> "$CLAUDE_ENV_FILE" << 'VARS'
export ASTRO_TELEMETRY_DISABLED=1
export ASTRO_DEV_BACKGROUND=1
export ASTRO_PREVIEW_BACKGROUND=1
export PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium
export PLAYWRIGHT_NO_SANDBOX=1
VARS
