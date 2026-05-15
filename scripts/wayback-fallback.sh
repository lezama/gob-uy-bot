#!/usr/bin/env bash
# Wayback Machine fallback.
#
# Use when a URL returns 404 (real, persistent) — the live page is gone
# but the Internet Archive may still have a copy.
#
#   scripts/wayback-fallback.sh <url>
#
# Output (stdout) one of:
#   SNAPSHOT <archive-url>   # found a recent capture
#   TRIGGERED <save-url>     # asked archive.org to capture now (slow)
#   NONE                     # no capture available
#
# Exit codes: 0 if SNAPSHOT or TRIGGERED, 1 if NONE / error.

set -u
url="${1:-}"
if [[ -z "$url" ]]; then
  echo "usage: wayback-fallback.sh <url>" >&2
  exit 1
fi

# 1. Ask the Wayback Availability API for the closest snapshot.
#    Docs: https://archive.org/help/wayback_api.php
resp=$(curl -sL --max-time 15 \
  "https://archive.org/wayback/available?url=$(printf '%s' "$url" | jq -sRr @uri)" 2>/dev/null || true)

if [[ -n "$resp" ]]; then
  snap=$(echo "$resp" | jq -r '.archived_snapshots.closest.url // empty' 2>/dev/null || true)
  if [[ -n "$snap" ]]; then
    echo "SNAPSHOT $snap"
    exit 0
  fi
fi

# 2. No snapshot — fire-and-forget a save request so future cycles have it.
save_url="https://web.archive.org/save/$url"
curl -sL --max-time 10 -o /dev/null "$save_url" 2>/dev/null && {
  echo "TRIGGERED $save_url"
  exit 0
}

echo "NONE"
exit 1
