#!/usr/bin/env bash
# Wrapper around scripts/fetch-browser.js so the agent can call this with
# a stable invocation regardless of node-path quirks.
#
#   scripts/fetch-browser.sh <url>             # html to stdout
#   scripts/fetch-browser.sh <url> --screenshot # also save screenshot
#
# Exit codes match fetch-browser.js (0 ok, 2 4xx/5xx, 3 empty body, 1 error).

set -u
url="${1:-}"
shift || true
if [[ -z "$url" ]]; then
  echo "usage: fetch-browser.sh <url> [--screenshot]" >&2
  exit 1
fi

here="$(cd "$(dirname "$0")" && pwd)"
node "$here/fetch-browser.js" "$url" "$@"
